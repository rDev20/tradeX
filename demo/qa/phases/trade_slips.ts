// Trade Slips MVP â€” channel execution room, persisted stages, target legs, API isolation.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { CheckContext, expect } from "../lib/check.js";
import { HttpClient } from "../lib/http.js";
import { cleanupTestUsers, execSql, queryOne } from "../lib/db.js";

const WEB_DIR = resolve(import.meta.dirname, "../../web");
const TAG = `qats${Date.now().toString(36)}`;

function readWeb(rel: string): string {
  return readFileSync(resolve(WEB_DIR, rel), "utf8");
}

function ensureTradeSlipTables() {
  execSql(`
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
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  execSql(`
    CREATE TABLE IF NOT EXISTS TradeSlipEvent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slipId INTEGER NOT NULL,
      stage TEXT NOT NULL,
      label TEXT NOT NULL,
      detail TEXT,
      status TEXT NOT NULL DEFAULT 'done',
      occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      position INTEGER NOT NULL
    )
  `);
  execSql(`
    CREATE TABLE IF NOT EXISTS TradeTargetLeg (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slipId INTEGER NOT NULL,
      label TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      hitAt DATETIME,
      position INTEGER NOT NULL
    )
  `);
}

export async function runTradeSlips(ctx: CheckContext) {
  ctx.section("Static · files and schema");

  await ctx.check("Trade Slips route, API, and component exist", () => {
    expect(existsSync(resolve(WEB_DIR, "app/(app)/trading-floor/[channelId]/page.tsx"))).toBeTruthy();
    expect(existsSync(resolve(WEB_DIR, "app/api/trade-slips/[channelId]/route.ts"))).toBeTruthy();
    expect(existsSync(resolve(WEB_DIR, "components/trade-slips-view.tsx"))).toBeTruthy();
  });

  await ctx.check("Schema has persisted slip, event, and target leg models", () => {
    const s = readWeb("prisma/schema.prisma");
    for (const model of ["model TradeSlip", "model TradeSlipEvent", "model TradeTargetLeg"]) {
      expect(s).toContain(model);
    }
  });

  await ctx.check("Trading Floor CTA links to channel Trade Slips route", () => {
    const s = readWeb("components/trading-floor-view.tsx");
    expect(s).toContain("`/trading-floor/${channel.id}?date=${selectedDate}`");
  });

  await ctx.check("Parser stores multiple targets while preserving first target", () => {
    const s = readFileSync(resolve(WEB_DIR, "../worker/parser.py"), "utf8");
    expect(s).toContain("targets: list[float]");
    expect(s).toContain("target = targets[0]");
  });

  ctx.section("Setup · seeded user and slips");

  const client = new HttpClient();
  const otherClient = new HttpClient();
  const user = {
    fullName: "Trade Slips QA",
    email: `trade-slips-${TAG}@tradex-qa.in`,
    phone: "+919876543210",
    password: "qa-password-123",
  };

  await ctx.check("Unauthenticated API returns 401", async () => {
    const r = await new HttpClient().get("/api/trade-slips/1");
    expect(r.status).toBe(401);
  });

  await ctx.check("Sign up and onboard primary user", async () => {
    const r = await client.postJson("/api/auth/signup", { ...user, passwordConfirm: user.password });
    expect(r.status).toBe(200);
    const id = queryOne<{ id: number }>("SELECT id FROM User WHERE email = ?", [user.email])?.id;
    if (!id) throw new Error("primary user missing");
    execSql("UPDATE User SET onboardingStep='done', onboardedAt=? WHERE id = ?", [new Date().toISOString(), id]);
  });

  const userId = queryOne<{ id: number }>("SELECT id FROM User WHERE email = ?", [user.email])?.id;
  if (!userId) throw new Error("setup user not found");

  let channelId = 0;
  await ctx.check("Seed channel, messages, persisted slips, and market ticks", () => {
    ensureTradeSlipTables();
    const now = new Date();
    const iso = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();

    execSql(
      "INSERT INTO Channel(userId, tgId, name, username, selected, mode, budget, addedAt) VALUES (?, ?, 'Slip Test Channel', 'sliptest', 1, 'evaluation', 100000, ?)",
      [userId, `slip-${TAG}`, iso(-60_000)],
    );
    channelId = queryOne<{ id: number }>("SELECT id FROM Channel WHERE userId = ? AND tgId = ?", [userId, `slip-${TAG}`])?.id ?? 0;
    if (!channelId) throw new Error("channel seed failed");

    execSql(
      "INSERT INTO Message(userId, channelId, tgMessageId, text, postedAt, parsed) VALUES (?, ?, 'raw-1', 'BUY INFY 1500 SL 1480 T1 1520 T2 1540', ?, 1)",
      [userId, channelId, iso(-45_000)],
    );
    const m1 = queryOne<{ id: number }>("SELECT id FROM Message WHERE channelId = ? AND tgMessageId = 'raw-1'", [channelId])?.id;
    execSql(
      "INSERT INTO ParsedSignal(userId, messageId, channelId, symbol, side, instrument, entry, stopLoss, target, confidence, raw, parser, parsedAt) VALUES (?, ?, ?, 'INFY', 'BUY', 'EQ', 1500, 1480, 1520, 0.88, 'BUY INFY', 'heuristic', ?)",
      [userId, m1, channelId, iso(-42_000)],
    );
    const s1 = queryOne<{ id: number }>("SELECT id FROM ParsedSignal WHERE messageId = ?", [m1])?.id;
    execSql(
      "INSERT INTO PaperTrade(userId, signalId, channelId, symbol, side, instrument, entry, stopLoss, target, qty, openedAt) VALUES (?, ?, ?, 'INFY', 'BUY', 'EQ', 1500, 1480, 1520, 10, ?)",
      [userId, s1, channelId, iso(-38_000)],
    );
    const t1 = queryOne<{ id: number }>("SELECT id FROM PaperTrade WHERE signalId = ?", [s1])?.id;
    execSql(
      "INSERT INTO TradeSlip(userId, channelId, messageId, signalId, tradeId, status, moneyMode, symbol, side, instrument, entry, stopLoss, target, receivedAt, executedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'TRACKING', 'paper', 'INFY', 'BUY', 'EQ', 1500, 1480, 1520, ?, ?, ?, ?)",
      [userId, channelId, m1, s1, t1, iso(-45_000), iso(-38_000), iso(-45_000), iso(-38_000)],
    );
    const slipId = queryOne<{ id: number }>("SELECT id FROM TradeSlip WHERE messageId = ?", [m1])?.id;
    for (const [position, stage, label] of [
      [1, "MESSAGE_RECEIVED", "Message received"],
      [2, "PARSING", "Parsing signal"],
      [3, "STOCK_DETECTED", "Stock detected"],
      [4, "PAPER_READY", "Paper simulator ready"],
      [5, "ENTRY_EXECUTED", "Entry executed"],
      [6, "TRACKING", "Tracking targets"],
    ] as const) {
      execSql(
        "INSERT INTO TradeSlipEvent(slipId, stage, label, detail, status, occurredAt, position) VALUES (?, ?, ?, 'qa', ?, ?, ?)",
        [slipId, stage, label, position === 6 ? "active" : "done", iso(-45_000 + position * 1000), position],
      );
    }
    execSql("INSERT INTO TradeTargetLeg(slipId, label, price, status, position) VALUES (?, 'T1', 1520, 'pending', 1)", [slipId]);
    execSql("INSERT INTO TradeTargetLeg(slipId, label, price, status, position) VALUES (?, 'T2', 1540, 'pending', 2)", [slipId]);

    execSql(
      "INSERT INTO Message(userId, channelId, tgMessageId, text, postedAt, parsed) VALUES (?, ?, 'raw-2', 'BUY RELIANCE 1300 SL 1280 TGT 1350', ?, 1)",
      [userId, channelId, iso(-30_000)],
    );
    const m2 = queryOne<{ id: number }>("SELECT id FROM Message WHERE channelId = ? AND tgMessageId = 'raw-2'", [channelId])?.id;
    execSql(
      "INSERT INTO ParsedSignal(userId, messageId, channelId, symbol, side, instrument, entry, stopLoss, target, confidence, raw, parser, parsedAt) VALUES (?, ?, ?, 'RELIANCE', 'BUY', 'EQ', 1300, 1280, 1350, 0.82, 'BUY RELIANCE', 'heuristic', ?)",
      [userId, m2, channelId, iso(-28_000)],
    );
    const s2 = queryOne<{ id: number }>("SELECT id FROM ParsedSignal WHERE messageId = ?", [m2])?.id;
    execSql(
      "INSERT INTO PaperTrade(userId, signalId, channelId, symbol, side, instrument, entry, stopLoss, target, exit, exitReason, qty, pnl, grossPnl, costs, openedAt, closedAt) VALUES (?, ?, ?, 'RELIANCE', 'BUY', 'EQ', 1300, 1280, 1350, 1350, 'TARGET', 5, 210, 250, 40, ?, ?)",
      [userId, s2, channelId, iso(-26_000), iso(-10_000)],
    );

    execSql(
      "INSERT INTO Message(userId, channelId, tgMessageId, text, postedAt, parsed) VALUES (?, ?, 'raw-3', 'fresh possible trade message', ?, 0)",
      [userId, channelId, iso(-5_000)],
    );

    execSql("INSERT INTO Symbol(ticker, displayName, kind) VALUES('INFY.NS', 'Infosys', 'EQUITY') ON CONFLICT(ticker) DO NOTHING");
    execSql("INSERT INTO PriceTick(ticker, price, change, at) VALUES('INFY.NS', 1510, 0.8, ?)", [iso(-1_000)]);
  });

  ctx.section("Functional · API behavior");

  await ctx.check("Other user cannot access primary user's channel", async () => {
    const other = {
      fullName: "Other Trade Slips QA",
      email: `trade-slips-other-${TAG}@tradex-qa.in`,
      phone: "+919999111111",
      password: "qa-password-123",
    };
    await otherClient.postJson("/api/auth/signup", { ...other, passwordConfirm: other.password });
    const oid = queryOne<{ id: number }>("SELECT id FROM User WHERE email = ?", [other.email])?.id;
    if (oid) execSql("UPDATE User SET onboardingStep='done', onboardedAt=? WHERE id = ?", [new Date().toISOString(), oid]);
    const r = await otherClient.get(`/api/trade-slips/${channelId}`);
    expect(r.status).toBe(404);
  });

  await ctx.check("Selected channel/date returns messages, active slip, and completed slips", async () => {
    const r = await client.get(`/api/trade-slips/${channelId}`);
    expect(r.status).toBe(200);
    const j = (await r.json()) as {
      latestMessages: unknown[];
      activeSlips: { status: string }[];
      completedSlips: { status: string }[];
    };
    if (j.latestMessages.length < 3) throw new Error(`expected at least 3 messages, got ${j.latestMessages.length}`);
    expect(j.activeSlips.some((s) => s.status === "RECEIVED")).toBeTruthy();
    expect(j.completedSlips.some((s) => s.status === "TRACKING")).toBeTruthy();
    expect(j.completedSlips.some((s) => s.status === "CLOSED")).toBeTruthy();
  });

  await ctx.check("Open persisted trade shows multiple target legs and LTP", async () => {
    const r = await client.get(`/api/trade-slips/${channelId}`);
    const j = (await r.json()) as {
      completedSlips: { symbol: string | null; targets: unknown[]; ltp: number | null; events: unknown[] }[];
    };
    const infy = j.completedSlips.find((s) => s.symbol === "INFY");
    if (!infy) throw new Error("INFY tracking slip missing");
    expect(infy.targets.length).toBe(2);
    expect(infy.ltp).toBe(1510);
    if (infy.events.length < 6) throw new Error("timeline events missing");
  });

  ctx.section("Cleanup");

  await ctx.check("Cleanup QA users", () => {
    cleanupTestUsers(TAG);
    const left = queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM User WHERE email LIKE ?", [`%${TAG}%`])?.count ?? 0;
    expect(left).toBe(0);
  });
}
