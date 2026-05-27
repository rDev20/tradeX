import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const userId = session.userId;
  const todayStart = startOfTodayIST();

  const [
    tg,
    statusRow,
    channels,
    lastTick,
    lastEvent,
    recentMessages,
    recentSignals,
    recentTrades,
    messagesToday,
    signalsToday,
  ] =
    await Promise.all([
      db.userTelegramAccount.findUnique({ where: { userId } }),
      db.userServiceStatus.findUnique({ where: { userId } }),
      db.channel.findMany({
        where: { userId, selected: true },
        include: {
          _count: { select: { messages: true, signals: true, trades: true } },
          trades: { include: { signal: { select: { parsedAt: true } } } },
        },
      }),
      db.priceTick.findFirst({ orderBy: { at: "desc" } }),
      db.serviceEvent.findFirst({ where: { userId }, orderBy: { at: "desc" } }),
      db.message.findMany({
        where: { userId, channel: { selected: true } },
        orderBy: { postedAt: "desc" },
        take: 15,
        include: { channel: { select: { name: true, username: true, id: true } } },
      }),
      db.parsedSignal.findMany({
        where: { userId },
        orderBy: { parsedAt: "desc" },
        take: 15,
        include: { channel: { select: { name: true, username: true, id: true } } },
      }),
      db.paperTrade.findMany({
        where: { userId },
        orderBy: { openedAt: "desc" },
        take: 50,
        include: {
          channel: { select: { name: true, username: true, id: true } },
          signal: { select: { parsedAt: true } },
        },
      }),
      db.message.count({
        where: { userId, postedAt: { gte: todayStart }, channel: { selected: true } },
      }),
      db.parsedSignal.count({
        where: { userId, parsedAt: { gte: todayStart }, channel: { selected: true } },
      }),
    ]);

  const status = (statusRow?.status ?? "stopped") as "running" | "stopped";

  const totalBudget = channels.reduce((s, c) => s + c.budget, 0);
  const totalPnl = channels.reduce(
    (s, c) => s + c.trades.reduce((ts, t) => ts + (t.pnl ?? 0), 0),
    0,
  );
  const todayTrades = channels.reduce(
    (s, c) => s + c.trades.filter((t) => tradeActivityAt(t) >= todayStart).length,
    0,
  );
  const todayPnl = channels.reduce(
    (s, c) =>
      s +
      c.trades
        .filter((t) => tradeActivityAt(t) >= todayStart)
        .reduce((ts, t) => ts + (t.pnl ?? 0), 0),
    0,
  );

  const channelCards = channels.map((c) => {
    const tradesToday = c.trades.filter((t) => tradeActivityAt(t) >= todayStart);
    const todayPnlChannel = tradesToday.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const lifetimePnl = c.trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const lastTrade = c.trades.length
      ? c.trades.reduce((a, b) => (tradeActivityAt(a) > tradeActivityAt(b) ? a : b))
      : null;
    return {
      id: c.id,
      name: c.name,
      username: c.username,
      budget: c.budget,
      tradesTotal: c._count.trades,
      tradesToday: tradesToday.length,
      todayPnl: todayPnlChannel,
      lifetimePnl,
      messages: c._count.messages,
      signals: c._count.signals,
      lastActivityAt: lastTrade ? tradeActivityAt(lastTrade) : null,
    };
  });

  type Event = {
    type: "MESSAGE" | "SIGNAL" | "TRADE_OPENED" | "TRADE_CLOSED";
    at: string;
    channelId: number | null;
    channelName: string | null;
    text: string;
    sub?: string;
    tone?: "up" | "down" | "neutral";
  };

  const events: Event[] = [];

  for (const m of recentMessages) {
    events.push({
      type: "MESSAGE",
      at: m.postedAt.toISOString(),
      channelId: m.channel.id,
      channelName: m.channel.name,
      text: truncate(m.text, 120),
      sub: m.channel.username ? `@${m.channel.username}` : undefined,
      tone: "neutral",
    });
  }
  for (const s of recentSignals) {
    events.push({
      type: "SIGNAL",
      at: s.parsedAt.toISOString(),
      channelId: s.channel.id,
      channelName: s.channel.name,
      text: `${s.side} ${s.symbol}${s.instrument === "CE" || s.instrument === "PE" ? ` ${s.strike ?? ""} ${s.instrument}` : ""} @ ₹${s.entry}`,
      sub: `SL ₹${s.stopLoss ?? "—"} · TGT ₹${s.target ?? "—"}`,
      tone: s.side === "BUY" ? "up" : "down",
    });
  }
  for (const t of recentTrades) {
    if (t.closedAt) {
      events.push({
        type: "TRADE_CLOSED",
        at: t.closedAt.toISOString(),
        channelId: t.channel.id,
        channelName: t.channel.name,
        text: `${t.symbol} ${t.side} ${t.exitReason ?? "exit"} · ${t.pnl !== null ? signed(t.pnl) : "—"}`,
        sub: `entry ₹${t.entry} · exit ₹${t.exit ?? "—"}`,
        tone: (t.pnl ?? 0) >= 0 ? "up" : "down",
      });
    }
    events.push({
      type: "TRADE_OPENED",
      at: tradeActivityAt(t).toISOString(),
      channelId: t.channel.id,
      channelName: t.channel.name,
      text: `Paper trade opened · ${t.side} ${t.symbol} @ ₹${t.entry}`,
      sub: t.target ? `target ₹${t.target} · SL ₹${t.stopLoss ?? "—"}` : undefined,
      tone: t.side === "BUY" ? "up" : "down",
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({
    serviceStatus: status,
    serviceEvent: lastEvent
      ? { type: lastEvent.event, at: lastEvent.at }
      : null,
    telegram: {
      connected: !!tg && !!tg.connectedAt,
      name: tg?.tgFirstName ?? null,
      phone: tg?.phone ?? null,
      username: tg?.tgUsername ?? null,
      connectedAt: tg?.connectedAt ?? null,
    },
    counts: {
      channelsSelected: channels.length,
      messagesToday,
      signalsToday,
      tradesToday: todayTrades,
    },
    summary: { totalBudget, totalPnl, todayPnl },
    lastTickAt: lastTick?.at ?? null,
    channels: channelCards,
    events: events.slice(0, 30),
  });
}

function startOfTodayIST(): Date {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs);
  const istMidnight = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0),
  );
  return new Date(istMidnight.getTime() - istOffsetMs);
}

function tradeActivityAt(trade: { openedAt: Date; signal?: { parsedAt: Date } | null }): Date {
  return trade.signal?.parsedAt ?? trade.openedAt;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function signed(v: number): string {
  return (v >= 0 ? "+" : "") + "₹" + v.toFixed(2);
}
