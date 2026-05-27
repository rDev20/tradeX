import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { DEMO_SYMBOLS } from "@/lib/symbols";

export const dynamic = "force-dynamic";

// Map ParsedSignal symbol → yfinance ticker. Mirror of worker/main.py SYMBOL_TO_TICKER.
const SYMBOL_TO_TICKER: Record<string, string> = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  SENSEX: "^BSESN",
  RELIANCE: "RELIANCE.NS",
  TCS: "TCS.NS",
  HDFCBANK: "HDFCBANK.NS",
  HDFC: "HDFCBANK.NS",
  INFY: "INFY.NS",
  ICICIBANK: "ICICIBANK.NS",
  ICICI: "ICICIBANK.NS",
  SBIN: "SBIN.NS",
  SBI: "SBIN.NS",
  BAJFINANCE: "BAJFINANCE.NS",
  ADANIENT: "ADANIENT.NS",
  MARUTI: "MARUTI.NS",
  AXISBANK: "AXISBANK.NS",
  KOTAKBANK: "KOTAKBANK.NS",
  LT: "LT.NS",
  WIPRO: "WIPRO.NS",
  HCLTECH: "HCLTECH.NS",
  HINDUNILVR: "HINDUNILVR.NS",
  ITC: "ITC.NS",
  ONGC: "ONGC.NS",
  BPCL: "BPCL.NS",
  TATASTEEL: "TATASTEEL.NS",
  JSWSTEEL: "JSWSTEEL.NS",
  DRREDDY: "DRREDDY.NS",
  SUNPHARMA: "SUNPHARMA.NS",
  EICHERMOT: "EICHERMOT.NS",
};

const SYMBOL_NAME = new Map(DEMO_SYMBOLS.map((s) => [s.ticker, s.displayName]));

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const userId = session.userId;

  const [openTrades, closedTrades, latestTicks] = await Promise.all([
    db.paperTrade.findMany({
      where: { userId, closedAt: null },
      orderBy: { openedAt: "desc" },
      include: { channel: { select: { id: true, name: true, username: true } } },
    }),
    db.paperTrade.findMany({
      where: { userId, closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 100,
      include: { channel: { select: { id: true, name: true, username: true } } },
    }),
    db.priceTick.findMany({ orderBy: { at: "desc" }, take: 200 }),
  ]);

  // Latest tick per ticker
  const tickByTicker = new Map<string, { price: number; at: Date }>();
  for (const t of latestTicks) {
    if (!tickByTicker.has(t.ticker)) {
      tickByTicker.set(t.ticker, { price: t.price, at: t.at });
    }
  }

  function resolveLtp(symbol: string): { price: number | null; at: Date | null; ticker: string | null } {
    const ticker = SYMBOL_TO_TICKER[symbol.toUpperCase()] ?? null;
    if (!ticker) return { price: null, at: null, ticker: null };
    const tick = tickByTicker.get(ticker);
    return { price: tick?.price ?? null, at: tick?.at ?? null, ticker };
  }

  const openPositions = openTrades.map((t) => {
    const { price: ltp, at: ltpAt, ticker } = resolveLtp(t.symbol);
    let unrealized: number | null = null;
    let pctChange: number | null = null;
    let currentValue: number | null = null;
    const investedValue = (t.entry ?? 0) * t.qty;

    if (ltp !== null && t.entry) {
      // For options (CE/PE) entry is option premium — we don't have live option premium tracking,
      // so show ltp/entry as N/A for options. Equity/index uses spot directly.
      if (t.instrument === "EQ" || t.instrument === "INDEX") {
        let move = ltp - t.entry;
        if (t.side === "SELL") move = -move;
        unrealized = move * t.qty;
        currentValue = ltp * t.qty;
        pctChange = (move / t.entry) * 100;
      }
    }

    return {
      id: t.id,
      symbol: t.symbol,
      displayName: ticker ? (SYMBOL_NAME.get(ticker) ?? t.symbol) : t.symbol,
      ticker,
      side: t.side,
      instrument: t.instrument,
      qty: t.qty,
      entry: t.entry,
      ltp,
      ltpAt: ltpAt?.toISOString() ?? null,
      target: t.target,
      stopLoss: t.stopLoss,
      investedValue,
      currentValue,
      unrealized,
      pctChange,
      openedAt: t.openedAt.toISOString(),
      timeInTrade: Date.now() - new Date(t.openedAt).getTime(),
      channel: t.channel,
    };
  });

  const closedPositions = closedTrades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    side: t.side,
    instrument: t.instrument,
    qty: t.qty,
    entry: t.entry,
    exit: t.exit,
    exitReason: t.exitReason,
    grossPnl: t.grossPnl,
    netPnl: t.pnl,
    costs: t.costs,
    costsBreakdown: t.costsBreakdown ? JSON.parse(t.costsBreakdown) : null,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
    channel: t.channel,
  }));

  // Aggregates
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(Date.now() + istOffsetMs);
  const todayStartIst = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0),
  );
  const todayStart = new Date(todayStartIst.getTime() - istOffsetMs);

  const aggregates = {
    openCount: openPositions.length,
    invested: openPositions.reduce((s, p) => s + (p.investedValue ?? 0), 0),
    currentValue: openPositions.reduce(
      (s, p) => s + (p.currentValue ?? p.investedValue ?? 0),
      0,
    ),
    unrealizedPnl: openPositions.reduce((s, p) => s + (p.unrealized ?? 0), 0),
    realizedToday: closedPositions
      .filter((p) => p.closedAt && new Date(p.closedAt) >= todayStart)
      .reduce((s, p) => s + (p.netPnl ?? 0), 0),
    totalRealized: closedPositions.reduce((s, p) => s + (p.netPnl ?? 0), 0),
    totalCosts: closedPositions.reduce((s, p) => s + (p.costs ?? 0), 0),
  };

  return NextResponse.json({
    aggregates,
    open: openPositions,
    closed: closedPositions,
    asOf: new Date().toISOString(),
  });
}
