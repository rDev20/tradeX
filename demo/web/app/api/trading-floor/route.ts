import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { DEMO_SYMBOLS } from "@/lib/symbols";
import { marketStatus } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const SYMBOL_TO_TICKER: Record<string, string> = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  SENSEX: "^BSESN",
  RELIANCE: "RELIANCE.NS",
  TCS: "TCS.NS",
  HDFCBANK: "HDFCBANK.NS",
  HDFC: "HDFCBANK.NS",
  INFY: "INFY.NS",
  INFOSYS: "INFY.NS",
  ICICIBANK: "ICICIBANK.NS",
  ICICI: "ICICIBANK.NS",
  SBIN: "SBIN.NS",
  SBI: "SBIN.NS",
  BAJFINANCE: "BAJFINANCE.NS",
  BAJAJFINANCE: "BAJFINANCE.NS",
  ADANIENT: "ADANIENT.NS",
  ADANI: "ADANIENT.NS",
  MARUTI: "MARUTI.NS",
  AXISBANK: "AXISBANK.NS",
  AXIS: "AXISBANK.NS",
  KOTAKBANK: "KOTAKBANK.NS",
  KOTAK: "KOTAKBANK.NS",
  LT: "LT.NS",
  LARSEN: "LT.NS",
  WIPRO: "WIPRO.NS",
  HCLTECH: "HCLTECH.NS",
  HCL: "HCLTECH.NS",
  HINDUNILVR: "HINDUNILVR.NS",
  HINDUNILEVER: "HINDUNILVR.NS",
  ITC: "ITC.NS",
  ONGC: "ONGC.NS",
  BPCL: "BPCL.NS",
  TATASTEEL: "TATASTEEL.NS",
  JSWSTEEL: "JSWSTEEL.NS",
  MAHINDRA: "M&M.NS",
  DRREDDY: "DRREDDY.NS",
  SUNPHARMA: "SUNPHARMA.NS",
  EICHERMOT: "EICHERMOT.NS",
};

const INDEX_TICKERS = ["^NSEI", "^NSEBANK", "^BSESN", "USDINR=X"];
const UNSUCCESSFUL_REASONS = new Set(["UNMAPPED", "DATA_ERROR", "NO_DATA"]);

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const selectedDate = parseDateParam(url.searchParams.get("date")) ?? todayISTKey();
  const { start, end } = istDayRange(selectedDate);
  const { start: monthStart, end: monthEnd } = istMonthRange(selectedDate);
  const todayKey = todayISTKey();
  const isToday = selectedDate === todayKey;
  const userId = session.userId;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { tradePlan: true },
  });
  if (!user) return NextResponse.json({ error: "NO_USER" }, { status: 404 });

  if (user.role !== "admin") {
    const [sourceChannels, sourceMessages, sourceSignals, latestTicks, lastTick] = await Promise.all([
      db.sourceChannel.findMany({
        where: { selected: true },
        orderBy: { name: "asc" },
      }),
      db.sourceMessage.findMany({
        where: { postedAt: { gte: start, lt: end }, channel: { selected: true } },
        select: { id: true, channelId: true },
      }),
      db.sourceSignal.findMany({
        where: { parsedAt: { gte: start, lt: end }, channel: { selected: true } },
        select: { id: true, channelId: true },
      }),
      db.priceTick.findMany({ orderBy: { at: "desc" }, take: 500 }),
      db.priceTick.findFirst({ orderBy: { at: "desc" } }),
    ]);

    const latestByTicker = latestTickMap(latestTicks);
    const messagesByChannel = countBy(sourceMessages.map((m) => m.channelId));
    const signalsByChannel = countBy(sourceSignals.map((s) => s.channelId));
    const plan = user.tradePlan ?? { minFund: 10000, lots: 1 };

    return NextResponse.json({
      selectedDate,
      today: todayKey,
      isToday,
      calendar: buildCalendar(selectedDate, todayKey, []),
      market: {
        status: marketStatus().state,
        lastTickAt: lastTick?.at?.toISOString() ?? null,
        keyTiles: INDEX_TICKERS.map((ticker) => marketRow(ticker, latestByTicker)).filter(Boolean),
        topMovers: topMovers(latestByTicker),
      },
      channels: sourceChannels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        username: channel.username,
        dashboard: {
          messagesReceived: messagesByChannel.get(channel.id) ?? 0,
          alertsCaptured: signalsByChannel.get(channel.id) ?? 0,
          successfulTradesExecuted: 0,
          positiveTrades: 0,
          negativeTrades: 0,
          openingBalance: plan.minFund,
          currentValue: plan.minFund,
          pnl: 0,
          realizedGain: 0,
          unrealizedPnl: 0,
        },
        portfolio: [],
        cta: {
          live: isToday,
          label: isToday ? "WATCH LIVE" : "SOURCE SUMMARY",
        },
      })),
    });
  }

  const [channels, messages, signals, trades, calendarTrades, latestTicks, lastTick] = await Promise.all([
    db.channel.findMany({
      where: { userId, selected: true },
      orderBy: { addedAt: "asc" },
    }),
    db.message.findMany({
      where: { userId, postedAt: { gte: start, lt: end }, channel: { selected: true } },
      select: { id: true, channelId: true },
    }),
    db.parsedSignal.findMany({
      where: { userId, parsedAt: { gte: start, lt: end }, channel: { selected: true } },
      select: { id: true, channelId: true },
    }),
    db.paperTrade.findMany({
      where: { userId, channel: { selected: true } },
      orderBy: { openedAt: "asc" },
      include: { signal: { select: { parsedAt: true } } },
    }),
    db.paperTrade.findMany({
      where: {
        userId,
        signal: { parsedAt: { gte: monthStart, lt: monthEnd } },
        channel: { selected: true },
      },
      select: { exitReason: true, signal: { select: { parsedAt: true } } },
    }),
    db.priceTick.findMany({ orderBy: { at: "desc" }, take: 500 }),
    db.priceTick.findFirst({ orderBy: { at: "desc" } }),
  ]);

  const latestByTicker = latestTickMap(latestTicks);
  const messagesByChannel = countBy(messages.map((m) => m.channelId));
  const signalsByChannel = countBy(signals.map((s) => s.channelId));
  const tradesByChannel = groupBy(trades, (t) => t.channelId);
  const currentMarketStatus = marketStatus();
  const marketOpen = currentMarketStatus.state === "open";

  const cards = channels.map((channel) => {
    const channelTrades = tradesByChannel.get(channel.id) ?? [];
    const beforeDate = channelTrades.filter((t) => tradeActivityAt(t) < start);
    const dateTrades = channelTrades.filter((t) => {
      const activityAt = tradeActivityAt(t);
      return activityAt >= start && activityAt < end;
    });
    const successfulTrades = dateTrades.filter(isSuccessfulTrade);
    const portfolio = successfulTrades.map((trade) => portfolioRow(trade, latestByTicker));
    const realizedGain = successfulTrades
      .filter((t) => t.closedAt)
      .reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const unrealized = portfolio.reduce((sum, row) => sum + (row.status === "OPEN" ? (row.pnl ?? 0) : 0), 0);
    const beforePnl = beforeDate.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const openingBalance = channel.budget + beforePnl;
    const currentValue = openingBalance + realizedGain + unrealized;
    const pnl = currentValue - openingBalance;
    const positiveTrades = portfolio.filter((row) => (row.pnl ?? 0) > 0).length;
    const negativeTrades = portfolio.filter((row) => (row.pnl ?? 0) < 0).length;
    const hasOpenPosition = channelTrades.some((t) => !t.closedAt && isSuccessfulTrade(t));
    const ctaLive = isToday && (marketOpen || hasOpenPosition);

    return {
      id: channel.id,
      name: channel.name,
      username: channel.username,
      dashboard: {
        messagesReceived: messagesByChannel.get(channel.id) ?? 0,
        alertsCaptured: signalsByChannel.get(channel.id) ?? 0,
        successfulTradesExecuted: successfulTrades.length,
        positiveTrades,
        negativeTrades,
        openingBalance,
        currentValue,
        pnl,
        realizedGain,
        unrealizedPnl: unrealized,
      },
      portfolio,
      cta: {
        live: ctaLive,
        label: ctaLive ? "WATCH LIVE" : "DETAILS OF TRADES EXECUTED",
      },
    };
  });

  return NextResponse.json({
    selectedDate,
    today: todayKey,
    isToday,
    calendar: buildCalendar(selectedDate, todayKey, calendarTrades),
    market: {
      status: currentMarketStatus.state,
      lastTickAt: lastTick?.at?.toISOString() ?? null,
      keyTiles: INDEX_TICKERS.map((ticker) => marketRow(ticker, latestByTicker)).filter(Boolean),
      topMovers: topMovers(latestByTicker),
    },
    channels: cards,
  });
}

function parseDateParam(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function todayISTKey(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

function istDayRange(dateKey: string): { start: Date; end: Date } {
  const [year, month, day] = dateKey.split("-").map(Number);
  const istMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const start = new Date(istMidnight - IST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60_000);
  return { start, end };
}

function istMonthRange(dateKey: string): { start: Date; end: Date } {
  const [year, month] = dateKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0) - IST_OFFSET_MS);
  return { start, end };
}

function buildCalendar(
  selectedDate: string,
  todayKey: string,
  trades: { exitReason: string | null; signal: { parsedAt: Date } }[],
) {
  const [year, month] = selectedDate.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const tradeCounts = new Map<string, number>();

  for (const trade of trades) {
    if (!isSuccessfulTrade(trade)) continue;
    const key = dateKeyIST(trade.signal.parsedAt);
    tradeCounts.set(key, (tradeCounts.get(key) ?? 0) + 1);
  }

  return {
    month: `${year}-${pad(month)}`,
    days: Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${pad(month)}-${pad(day)}`;
      return {
        date,
        day,
        tradeCount: tradeCounts.get(date) ?? 0,
        disabled: date > todayKey,
      };
    }),
  };
}

function dateKeyIST(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function countBy(values: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function groupBy<T>(rows: T[], keyFn: (row: T) => number): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function latestTickMap(ticks: { ticker: string; price: number; change: number | null; at: Date }[]) {
  const map = new Map<string, { price: number; change: number | null; at: Date }>();
  for (const tick of ticks) {
    if (!map.has(tick.ticker)) {
      map.set(tick.ticker, { price: tick.price, change: tick.change, at: tick.at });
    }
  }
  return map;
}

function isSuccessfulTrade(trade: { exitReason: string | null }): boolean {
  return !trade.exitReason || !UNSUCCESSFUL_REASONS.has(trade.exitReason);
}

function tradeActivityAt(trade: { openedAt: Date; signal?: { parsedAt: Date } | null }): Date {
  return trade.signal?.parsedAt ?? trade.openedAt;
}

function portfolioRow(
  trade: {
    id: number;
    symbol: string;
    side: string;
    instrument: string;
    qty: number;
    entry: number;
    exit: number | null;
    target: number | null;
    stopLoss: number | null;
    pnl: number | null;
    closedAt: Date | null;
    exitReason: string | null;
  },
  ticks: Map<string, { price: number; change: number | null; at: Date }>,
) {
  const ticker = SYMBOL_TO_TICKER[trade.symbol.toUpperCase()] ?? null;
  const tick = ticker ? ticks.get(ticker) : null;
  const open = !trade.closedAt;
  const livePrice = tick?.price ?? null;
  const canMarkOpen = open && livePrice !== null && (trade.instrument === "EQ" || trade.instrument === "INDEX");
  const exitOrCurrent = open ? (canMarkOpen ? livePrice : null) : trade.exit;
  const pnl = open && canMarkOpen ? markToMarketPnl(trade.side, trade.entry, livePrice, trade.qty) : trade.pnl;
  const pctChange = exitOrCurrent !== null ? priceMovePct(trade.side, trade.entry, exitOrCurrent) : null;

  return {
    id: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    instrument: trade.instrument,
    status: open ? "OPEN" : trade.exitReason ?? "CLOSED",
    qty: trade.qty,
    entry: trade.entry,
    ltp: open ? livePrice : null,
    exit: trade.exit,
    currentPrice: exitOrCurrent,
    target: trade.target,
    stopLoss: trade.stopLoss,
    pnl,
    pctChange,
    ticker,
    ltpAt: tick?.at?.toISOString() ?? null,
  };
}

function markToMarketPnl(side: string, entry: number, ltp: number, qty: number): number {
  const move = side === "SELL" ? entry - ltp : ltp - entry;
  return round(move * qty);
}

function priceMovePct(side: string, entry: number, current: number): number | null {
  if (!entry) return null;
  const move = side === "SELL" ? entry - current : current - entry;
  return (move / entry) * 100;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function marketRow(
  ticker: string,
  ticks: Map<string, { price: number; change: number | null; at: Date }>,
) {
  const meta = DEMO_SYMBOLS.find((s) => s.ticker === ticker);
  const tick = ticks.get(ticker);
  if (!meta && !tick) return null;
  return {
    ticker,
    displayName: meta?.displayName ?? ticker,
    kind: meta?.kind ?? "EQUITY",
    exchange: meta?.exchange ?? "NSE",
    ltp: tick?.price ?? null,
    change: tick?.change ?? null,
    at: tick?.at?.toISOString() ?? null,
  };
}

function topMovers(ticks: Map<string, { price: number; change: number | null; at: Date }>) {
  return DEMO_SYMBOLS
    .filter((symbol) => symbol.kind === "EQUITY")
    .map((symbol) => marketRow(symbol.ticker, ticks))
    .filter((row): row is NonNullable<typeof row> => !!row && row.change !== null)
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))
    .slice(0, 5);
}
