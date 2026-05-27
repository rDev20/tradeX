import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const UNSUCCESSFUL_REASONS = new Set(["UNMAPPED", "DATA_ERROR", "NO_DATA"]);

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

type RouteParams = { params: Promise<{ channelId: string }> };

type RawSlip = {
  id: number;
  userId: number;
  channelId: number;
  messageId: number;
  signalId: number | null;
  tradeId: number | null;
  status: string;
  moneyMode: string;
  symbol: string | null;
  side: string | null;
  instrument: string | null;
  entry: number | null;
  stopLoss: number | null;
  target: number | null;
  receivedAt: Date | string;
  executedAt: Date | string | null;
  closedAt: Date | string | null;
  messageText: string;
  messagePostedAt: Date | string;
  confidence: number | null;
  exit: number | null;
  exitReason: string | null;
  qty: number | null;
  pnl: number | null;
  grossPnl: number | null;
  costs: number | null;
  openedAt: Date | string | null;
  tradeClosedAt: Date | string | null;
};

type RawEvent = {
  slipId: number;
  stage: string;
  label: string;
  detail: string | null;
  status: string;
  occurredAt: Date | string;
  position: number;
};

type RawLeg = {
  slipId: number;
  label: string;
  price: number;
  status: string;
  hitAt: Date | string | null;
  position: number;
};

type RawLegacy = {
  id: number;
  text: string;
  postedAt: Date | string;
  parsed: boolean | number;
  signalId: number | null;
  symbol: string | null;
  side: string | null;
  instrument: string | null;
  entry: number | null;
  stopLoss: number | null;
  target: number | null;
  confidence: number | null;
  parsedAt: Date | string | null;
  tradeId: number | null;
  qty: number | null;
  exit: number | null;
  exitReason: string | null;
  pnl: number | null;
  grossPnl: number | null;
  costs: number | null;
  openedAt: Date | string | null;
  closedAt: Date | string | null;
};

type RawMessage = {
  id: number;
  text: string;
  postedAt: Date | string;
  parsed: boolean | number;
};

export async function GET(request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  await ensureTradeSlipTables();

  const { channelId: channelIdParam } = await params;
  const channelId = Number(channelIdParam);
  if (!Number.isFinite(channelId)) {
    return NextResponse.json({ error: "INVALID_CHANNEL" }, { status: 400 });
  }

  const url = new URL(request.url);
  const selectedDate = parseDateParam(url.searchParams.get("date")) ?? todayISTKey();
  const { start, end } = istDayRange(selectedDate);
  const userId = session.userId;

  const channel = await db.channel.findFirst({
    where: { id: channelId, userId },
    select: { id: true, name: true, username: true, mode: true, budget: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const [messages, rawSlips, legacyMessages, latestTicks] = await Promise.all([
    db.$queryRawUnsafe<RawMessage[]>(
      `
      SELECT id, text, postedAt, parsed
      FROM Message
      WHERE userId = ? AND channelId = ? AND postedAt >= ? AND postedAt < ?
      ORDER BY postedAt DESC
      LIMIT 40
      `,
      userId,
      channelId,
      start.toISOString(),
      end.toISOString(),
    ),
    db.$queryRawUnsafe<RawSlip[]>(
      `
      SELECT
        ts.*,
        m.text AS messageText,
        m.postedAt AS messagePostedAt,
        ps.confidence AS confidence,
        pt.exit AS exit,
        pt.exitReason AS exitReason,
        pt.qty AS qty,
        pt.pnl AS pnl,
        pt.grossPnl AS grossPnl,
        pt.costs AS costs,
        pt.openedAt AS openedAt,
        pt.closedAt AS tradeClosedAt
      FROM TradeSlip ts
      JOIN Message m ON m.id = ts.messageId
      LEFT JOIN ParsedSignal ps ON ps.id = ts.signalId
      LEFT JOIN PaperTrade pt ON pt.id = ts.tradeId
      WHERE ts.userId = ? AND ts.channelId = ? AND ts.receivedAt >= ? AND ts.receivedAt < ?
      ORDER BY ts.receivedAt DESC
      `,
      userId,
      channelId,
      start.toISOString(),
      end.toISOString(),
    ),
    db.$queryRawUnsafe<RawLegacy[]>(
      `
      SELECT
        m.id AS id,
        m.text AS text,
        m.postedAt AS postedAt,
        m.parsed AS parsed,
        ps.id AS signalId,
        ps.symbol AS symbol,
        ps.side AS side,
        ps.instrument AS instrument,
        ps.entry AS entry,
        ps.stopLoss AS stopLoss,
        ps.target AS target,
        ps.confidence AS confidence,
        ps.parsedAt AS parsedAt,
        pt.id AS tradeId,
        pt.qty AS qty,
        pt.exit AS exit,
        pt.exitReason AS exitReason,
        pt.pnl AS pnl,
        pt.grossPnl AS grossPnl,
        pt.costs AS costs,
        pt.openedAt AS openedAt,
        pt.closedAt AS closedAt
      FROM Message m
      LEFT JOIN ParsedSignal ps ON ps.messageId = m.id
      LEFT JOIN PaperTrade pt ON pt.signalId = ps.id
      WHERE m.userId = ? AND m.channelId = ? AND m.postedAt >= ? AND m.postedAt < ?
      ORDER BY m.postedAt DESC
      LIMIT 50
      `,
      userId,
      channelId,
      start.toISOString(),
      end.toISOString(),
    ),
    db.priceTick.findMany({ orderBy: { at: "desc" }, take: 500 }),
  ]);

  const slipIds = rawSlips.map((s) => s.id);
  const [rawEvents, rawLegs] = slipIds.length
    ? await Promise.all([
        db.$queryRawUnsafe<RawEvent[]>(
          `SELECT slipId, stage, label, detail, status, occurredAt, position
           FROM TradeSlipEvent
           WHERE slipId IN (${slipIds.map(() => "?").join(",")})
           ORDER BY slipId ASC, position ASC`,
          ...slipIds,
        ),
        db.$queryRawUnsafe<RawLeg[]>(
          `SELECT slipId, label, price, status, hitAt, position
           FROM TradeTargetLeg
           WHERE slipId IN (${slipIds.map(() => "?").join(",")})
           ORDER BY slipId ASC, position ASC`,
          ...slipIds,
        ),
      ])
    : [[], []];

  const tickByTicker = latestTickMap(latestTicks);
  const persistedMessageIds = new Set(rawSlips.map((slip) => slip.messageId));
  const eventsBySlip = groupBy(rawEvents, (event) => event.slipId);
  const legsBySlip = groupBy(rawLegs, (leg) => leg.slipId);

  const persisted = rawSlips.map((slip) =>
    buildPersistedSlip(slip, eventsBySlip.get(slip.id) ?? [], legsBySlip.get(slip.id) ?? [], tickByTicker),
  );
  const legacy = legacyMessages
    .filter((message) => !persistedMessageIds.has(message.id))
    .map((message) => buildLegacySlip(message, tickByTicker));
  const allSlips = [...persisted, ...legacy].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  const activeSlips = allSlips.filter((slip) => !slip.executedAt && slip.status !== "FAILED");
  const completedSlips = allSlips.filter((slip) => slip.executedAt || slip.status === "FAILED");
  const hasLiveWork = activeSlips.length > 0 || completedSlips.some((slip) => slip.status === "TRACKING");

  return NextResponse.json({
    selectedDate,
    today: todayISTKey(),
    isToday: selectedDate === todayISTKey(),
    channel,
    status: selectedDate === todayISTKey() && hasLiveWork ? "live" : "summary",
    modeTag: channel.mode === "live" ? "real" : "paper",
    latestMessages: messages.map((message) => ({
      id: message.id,
      text: message.text,
      postedAt: isoValue(message.postedAt) ?? new Date().toISOString(),
      parsed: Boolean(message.parsed),
      slipId: allSlips.find((slip) => slip.messageId === message.id)?.id ?? null,
    })),
    activeSlips,
    completedSlips,
    asOf: new Date().toISOString(),
  });
}

async function ensureTradeSlipTables() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TradeSlip (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      channelId INTEGER NOT NULL,
      messageId INTEGER NOT NULL UNIQUE,
      signalId INTEGER UNIQUE,
      tradeId INTEGER UNIQUE,
      status TEXT NOT NULL DEFAULT 'RECEIVED',
      moneyMode TEXT NOT NULL DEFAULT 'paper',
      symbol TEXT,
      side TEXT,
      instrument TEXT,
      entry REAL,
      stopLoss REAL,
      target REAL,
      receivedAt DATETIME NOT NULL,
      executedAt DATETIME,
      closedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY(channelId) REFERENCES Channel(id) ON DELETE CASCADE,
      FOREIGN KEY(messageId) REFERENCES Message(id) ON DELETE CASCADE,
      FOREIGN KEY(signalId) REFERENCES ParsedSignal(id) ON DELETE SET NULL,
      FOREIGN KEY(tradeId) REFERENCES PaperTrade(id) ON DELETE SET NULL
    )
  `);
  await db.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS TradeSlip_userId_channelId_receivedAt_idx ON TradeSlip(userId, channelId, receivedAt)",
  );
  await db.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS TradeSlip_status_idx ON TradeSlip(status)");
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TradeSlipEvent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slipId INTEGER NOT NULL,
      stage TEXT NOT NULL,
      label TEXT NOT NULL,
      detail TEXT,
      status TEXT NOT NULL DEFAULT 'done',
      occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      position INTEGER NOT NULL,
      FOREIGN KEY(slipId) REFERENCES TradeSlip(id) ON DELETE CASCADE
    )
  `);
  await db.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS TradeSlipEvent_slipId_position_idx ON TradeSlipEvent(slipId, position)",
  );
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TradeTargetLeg (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slipId INTEGER NOT NULL,
      label TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      hitAt DATETIME,
      position INTEGER NOT NULL,
      FOREIGN KEY(slipId) REFERENCES TradeSlip(id) ON DELETE CASCADE
    )
  `);
  await db.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS TradeTargetLeg_slipId_position_idx ON TradeTargetLeg(slipId, position)",
  );
}

function buildPersistedSlip(
  slip: RawSlip,
  events: RawEvent[],
  legs: RawLeg[],
  ticks: Map<string, { price: number; change: number | null; at: Date }>,
) {
  const tick = resolveTick(slip.symbol, ticks);
  const closedAt = isoValue(slip.tradeClosedAt ?? slip.closedAt);
  const executedAt = isoValue(slip.executedAt ?? slip.openedAt);
  const receivedAt = isoValue(slip.receivedAt) ?? new Date().toISOString();
  const targets = legs.length
    ? legs.map((leg) => targetLeg(leg.label, leg.price, leg.status, isoValue(leg.hitAt), slip.side, tick.price))
    : slip.target !== null
      ? [targetLeg("T1", slip.target, "pending", null, slip.side, tick.price)]
      : [];

  return {
    id: `slip-${slip.id}`,
    source: "persisted",
    messageId: slip.messageId,
    tradeId: slip.tradeId,
    status: normalizeStatus(slip.status, closedAt),
    moneyMode: slip.moneyMode,
    symbol: slip.symbol,
    side: slip.side,
    instrument: slip.instrument,
    entry: slip.entry,
    stopLoss: slip.stopLoss,
    target: slip.target,
    targets,
    qty: slip.qty,
    exit: slip.exit,
    exitReason: slip.exitReason,
    pnl: slip.pnl,
    grossPnl: slip.grossPnl,
    costs: slip.costs,
    receivedAt,
    executedAt,
    closedAt,
    latencyMs: executedAt ? new Date(executedAt).getTime() - new Date(receivedAt).getTime() : null,
    message: slip.messageText,
    confidence: slip.confidence,
    ltp: tick.price,
    ltpAt: tick.at?.toISOString() ?? null,
    ticker: tick.ticker,
    events: events.map((event) => ({
      stage: event.stage,
      label: event.label,
      detail: event.detail,
      status: event.status,
      occurredAt: isoValue(event.occurredAt),
      position: event.position,
    })),
  };
}

function buildLegacySlip(
  message: RawLegacy,
  ticks: Map<string, { price: number; change: number | null; at: Date }>,
) {
  const parsed = Boolean(message.parsed);
  const hasSignal = message.signalId !== null;
  const hasTrade = message.tradeId !== null;
  const tick = resolveTick(message.symbol, ticks);
  const status = hasTrade
    ? message.closedAt
      ? UNSUCCESSFUL_REASONS.has(message.exitReason ?? "") ? "FAILED" : "CLOSED"
      : "TRACKING"
    : hasSignal
      ? "READY"
      : parsed
        ? "FAILED"
        : "RECEIVED";
  const receivedAt = isoValue(message.postedAt) ?? new Date().toISOString();
  const executedAt = isoValue(message.openedAt);
  const closedAt = isoValue(message.closedAt);
  const targets = message.target
    ? [targetLeg("T1", message.target, message.exitReason === "TARGET" ? "hit" : "pending", closedAt, message.side, tick.price)]
    : [];

  return {
    id: `legacy-${message.id}`,
    source: "legacy",
    messageId: message.id,
    tradeId: message.tradeId ?? null,
    status,
    moneyMode: "paper",
    symbol: message.symbol,
    side: message.side,
    instrument: message.instrument,
    entry: message.entry,
    stopLoss: message.stopLoss,
    target: message.target,
    targets,
    qty: message.qty,
    exit: message.exit,
    exitReason: message.exitReason,
    pnl: message.pnl,
    grossPnl: message.grossPnl,
    costs: message.costs,
    receivedAt,
    executedAt,
    closedAt,
    latencyMs: executedAt ? new Date(executedAt).getTime() - new Date(receivedAt).getTime() : null,
    message: message.text,
    confidence: message.confidence,
    ltp: tick.price,
    ltpAt: tick.at?.toISOString() ?? null,
    ticker: tick.ticker,
    events: buildLegacyEvents(message),
  };
}

function buildLegacyEvents(message: RawLegacy) {
  const postedAt = isoValue(message.postedAt) ?? new Date().toISOString();
  const parsedAt = isoValue(message.parsedAt) ?? postedAt;
  const openedAt = isoValue(message.openedAt);
  const closedAt = isoValue(message.closedAt);
  const events = [
    {
      stage: "MESSAGE_RECEIVED",
      label: "Message received",
      detail: "Telegram message entered tradeX.",
      status: "done",
      occurredAt: postedAt,
      position: 1,
    },
  ];
  if (!message.signalId) {
    events.push({
      stage: "PARSING",
      label: message.parsed ? "No trade signal found" : "Waiting to parse",
      detail: message.parsed ? "This message did not become a trade." : "Parser has not picked this up yet.",
      status: message.parsed ? "failed" : "active",
      occurredAt: postedAt,
      position: 2,
    });
    return events;
  }
  events.push(
    {
      stage: "PARSING",
      label: "Parsing complete",
      detail: "Heuristic parser extracted a tradable signal.",
      status: "done",
      occurredAt: parsedAt,
      position: 2,
    },
    {
      stage: "STOCK_DETECTED",
      label: "Stock detected",
      detail: `${message.side} ${message.symbol} at ${message.entry}.`,
      status: "done",
      occurredAt: parsedAt,
      position: 3,
    },
    {
      stage: "PAPER_READY",
      label: "Paper simulator ready",
      detail: "Paper trading mode skips broker connection.",
      status: "done",
      occurredAt: parsedAt,
      position: 4,
    },
  );
  if (!openedAt) return events;
  events.push(
    {
      stage: "PRECHECKS",
      label: "Pre-checks passed",
      detail: "Paper rules validated.",
      status: "done",
      occurredAt: openedAt,
      position: 5,
    },
    {
      stage: "ENTRY_EXECUTED",
      label: "Entry executed",
      detail: "Paper position opened.",
      status: "done",
      occurredAt: openedAt,
      position: 6,
    },
    {
      stage: closedAt ? "CLOSED" : "TRACKING",
      label: closedAt ? "Trade closed" : "Tracking targets",
      detail: message.exitReason ?? "Waiting for target or stop-loss.",
      status: closedAt ? "done" : "active",
      occurredAt: closedAt ?? openedAt,
      position: 7,
    },
  );
  return events;
}

function normalizeStatus(status: string, closedAt: string | null) {
  if (status === "EXECUTED" && !closedAt) return "TRACKING";
  return status;
}

function targetLeg(
  label: string,
  price: number,
  storedStatus: string,
  hitAt: string | null,
  side: string | null,
  ltp: number | null,
) {
  const liveHit =
    storedStatus === "pending" &&
    ltp !== null &&
    (side === "SELL" ? ltp <= price : ltp >= price);
  return {
    label,
    price,
    status: liveHit ? "hit" : storedStatus,
    hitAt,
  };
}

function resolveTick(symbol: string | null, ticks: Map<string, { price: number; change: number | null; at: Date }>) {
  const ticker = symbol ? SYMBOL_TO_TICKER[symbol.toUpperCase()] ?? null : null;
  const tick = ticker ? ticks.get(ticker) : null;
  return {
    ticker,
    price: tick?.price ?? null,
    change: tick?.change ?? null,
    at: tick?.at ?? null,
  };
}

function latestTickMap(ticks: { ticker: string; price: number; change: number | null; at: Date }[]) {
  const map = new Map<string, { price: number; change: number | null; at: Date }>();
  for (const tick of ticks) {
    if (!map.has(tick.ticker)) {
      map.set(tick.ticker, tick);
    }
  }
  return map;
}

function groupBy<T, K>(rows: T[], keyFn: (row: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
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

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function isoValue(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
