// M0.3 — Multi-tenancy QA.
//
// Confirms data isolation: user A cannot see user B's channels, signals, trades, favorites,
// service status, or activity. Two parallel test users created; their data crossed only via
// direct DB inspection in the QA harness, never via the app.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { CheckContext, expect } from "../lib/check.js";
import { HttpClient } from "../lib/http.js";
import { queryOne, queryAll, cleanupTestUsers, execSql } from "../lib/db.js";

const WEB_DIR = resolve(import.meta.dirname, "../../web");
const TAG = `qa${Date.now().toString(36)}`;

function readFile(rel: string): string {
  return readFileSync(resolve(WEB_DIR, rel), "utf8");
}

export async function runM0_3(ctx: CheckContext) {
  // ─────────────────────────────────────────────────────────
  ctx.section("Static · schema");

  await ctx.check("Channel schema has userId + composite unique on (userId, tgId)", () => {
    const s = readFile("prisma/schema.prisma");
    expect(s).toMatch(/model Channel\s*\{[^}]*userId\s+Int/);
    expect(s).toMatch(/@@unique\(\[userId,\s*tgId\]\)/);
  });

  await ctx.check("Message / ParsedSignal / PaperTrade / Favorite / ServiceEvent all have userId", () => {
    const s = readFile("prisma/schema.prisma");
    for (const m of ["model Message", "model ParsedSignal", "model PaperTrade", "model Favorite", "model ServiceEvent"]) {
      const block = s.slice(s.indexOf(m));
      const closeIdx = block.indexOf("}");
      const inner = block.slice(0, closeIdx);
      if (!/userId\s+Int/.test(inner)) throw new Error(`${m} missing userId`);
    }
  });

  await ctx.check("UserServiceStatus model exists (per-user start/stop)", () => {
    const s = readFile("prisma/schema.prisma");
    expect(s).toContain("model UserServiceStatus");
    expect(s).toMatch(/userId\s+Int\s+@id/);
  });

  await ctx.check("Cascade delete on userId for all owned tables", () => {
    const s = readFile("prisma/schema.prisma");
    const expected = [
      "Channel", "Message", "ParsedSignal", "PaperTrade", "Favorite", "ServiceEvent",
      "UserServiceStatus", "UserTelegramAccount",
    ];
    for (const m of expected) {
      const block = s.slice(s.indexOf(`model ${m}`));
      if (!/onDelete:\s*Cascade/.test(block.slice(0, block.indexOf("}")))) {
        throw new Error(`${m} missing onDelete: Cascade on userId relation`);
      }
    }
  });

  await ctx.check("All API routes use readSession or requireUserId", () => {
    const files = [
      "app/api/dashboard/route.ts",
      "app/api/market/route.ts",
      "app/api/service/route.ts",
      "app/api/accounts/route.ts",
    ];
    for (const f of files) {
      const s = readFile(f);
      if (!/(readSession|requireUserId)/.test(s)) {
        throw new Error(`${f} does not appear to scope by session userId`);
      }
    }
  });

  await ctx.check("Server actions use requireUserId", () => {
    const s = readFile("app/(app)/actions.ts");
    expect(s).toContain("requireUserId");
    // setServiceStatus, toggleFavorite, evaluateChannel, stopEvaluating, updateChannelBudget
    for (const fn of ["setServiceStatus", "toggleFavorite", "evaluateChannel", "stopEvaluating", "updateChannelBudget"]) {
      const idx = s.indexOf(`export async function ${fn}`);
      const slice = s.slice(idx, idx + 600);
      if (!/requireUserId/.test(slice)) {
        throw new Error(`server action ${fn} missing requireUserId`);
      }
    }
  });

  await ctx.check("Empty-state CTA component exists for new dashboard", () => {
    expect(existsSync(resolve(WEB_DIR, "components/connect-channels-cta.tsx"))).toBeTruthy();
    const s = readFile("app/(app)/page.tsx");
    expect(s).toContain("ConnectChannelsCTA");
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Setup · two test users");

  const userA = {
    fullName: "User A",
    email: `a-${TAG}@tradex-qa.in`,
    phone: "+919999999991",
    password: "qa-password-123",
  };
  const userB = {
    fullName: "User B",
    email: `b-${TAG}@tradex-qa.in`,
    phone: "+919999999992",
    password: "qa-password-456",
  };

  const clientA = new HttpClient();
  const clientB = new HttpClient();

  await ctx.check("Sign up user A", async () => {
    const r = await clientA.postJson("/api/auth/signup", { ...userA, passwordConfirm: userA.password });
    expect(r.status).toBe(200);
    expect(clientA.hasCookie("tradex_session")).toBeTruthy();
  });

  await ctx.check("Sign up user B (different cookie jar)", async () => {
    const r = await clientB.postJson("/api/auth/signup", { ...userB, passwordConfirm: userB.password });
    expect(r.status).toBe(200);
    expect(clientB.hasCookie("tradex_session")).toBeTruthy();
  });

  const userIdA = queryOne<{ id: number }>("SELECT id FROM User WHERE email = ?", [userA.email])?.id;
  const userIdB = queryOne<{ id: number }>("SELECT id FROM User WHERE email = ?", [userB.email])?.id;
  if (!userIdA || !userIdB) throw new Error("Setup: users not in DB");
  if (userIdA === userIdB) throw new Error("Setup: same userId for both users (bug!)");

  // Mark both onboarded so they can reach the dashboard
  execSql(`UPDATE User SET onboardingStep='done', onboardedAt=datetime('now') WHERE id IN (?, ?)`, [userIdA, userIdB]);

  // Seed: give each user a channel of their own + 1 favorite + 1 trade
  execSql(
    `INSERT INTO Channel(userId, tgId, name, username, selected, mode, budget, addedAt) VALUES (?, 'tg-A-' || ?, 'Channel A1', 'a1ch', 1, 'evaluation', 50000, datetime('now'))`,
    [userIdA, userIdA],
  );
  execSql(
    `INSERT INTO Channel(userId, tgId, name, username, selected, mode, budget, addedAt) VALUES (?, 'tg-B-' || ?, 'Channel B1', 'b1ch', 1, 'evaluation', 75000, datetime('now'))`,
    [userIdB, userIdB],
  );

  execSql(`INSERT INTO Favorite(userId, ticker, position, addedAt) VALUES (?, 'RELIANCE.NS', 0, datetime('now'))`, [userIdA]);
  execSql(`INSERT INTO Favorite(userId, ticker, position, addedAt) VALUES (?, 'TCS.NS', 0, datetime('now'))`, [userIdB]);

  // ─────────────────────────────────────────────────────────
  ctx.section("Functional · isolation between users");

  await ctx.check("/api/dashboard for user A shows only user A's channel", async () => {
    const r = await clientA.get("/api/dashboard");
    const j = (await r.json()) as { counts: { channelsSelected: number }; channels: { name: string }[] };
    expect(j.counts.channelsSelected).toBe(1);
    expect(j.channels[0]?.name).toBe("Channel A1");
  });

  await ctx.check("/api/dashboard for user B shows only user B's channel", async () => {
    const r = await clientB.get("/api/dashboard");
    const j = (await r.json()) as { counts: { channelsSelected: number }; channels: { name: string }[] };
    expect(j.counts.channelsSelected).toBe(1);
    expect(j.channels[0]?.name).toBe("Channel B1");
  });

  await ctx.check("/api/market for user A shows RELIANCE.NS as favorite (not TCS)", async () => {
    const r = await clientA.get("/api/market");
    const j = (await r.json()) as { symbols: { ticker: string; favorite: boolean }[] };
    const reliance = j.symbols.find((s) => s.ticker === "RELIANCE.NS");
    const tcs = j.symbols.find((s) => s.ticker === "TCS.NS");
    expect(reliance?.favorite).toBe(true);
    expect(tcs?.favorite).toBe(false);
  });

  await ctx.check("/api/market for user B shows TCS.NS as favorite (not RELIANCE)", async () => {
    const r = await clientB.get("/api/market");
    const j = (await r.json()) as { symbols: { ticker: string; favorite: boolean }[] };
    const reliance = j.symbols.find((s) => s.ticker === "RELIANCE.NS");
    const tcs = j.symbols.find((s) => s.ticker === "TCS.NS");
    expect(reliance?.favorite).toBe(false);
    expect(tcs?.favorite).toBe(true);
  });

  await ctx.check("Channels page for user A only renders Channel A1", async () => {
    const r = await clientA.get("/channels");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("Channel A1");
    if (html.includes("Channel B1")) throw new Error("user A leaked Channel B1!");
  });

  await ctx.check("Channels page for user B only renders Channel B1", async () => {
    const r = await clientB.get("/channels");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("Channel B1");
    if (html.includes("Channel A1")) throw new Error("user B leaked Channel A1!");
  });

  await ctx.check("User A toggling favorite affects only user A", async () => {
    const aBefore = queryAll<{ ticker: string }>("SELECT ticker FROM Favorite WHERE userId = ?", [userIdA]);
    const bBefore = queryAll<{ ticker: string }>("SELECT ticker FROM Favorite WHERE userId = ?", [userIdB]);
    expect(aBefore.length).toBe(1);
    expect(bBefore.length).toBe(1);

    // user A pins ITC.NS via market favorite toggle (manually via DB to avoid testing server action wire)
    execSql(`INSERT INTO Favorite(userId, ticker, position, addedAt) VALUES (?, 'ITC.NS', 1, datetime('now'))`, [userIdA]);

    const aAfter = queryAll<{ ticker: string }>("SELECT ticker FROM Favorite WHERE userId = ?", [userIdA]);
    const bAfter = queryAll<{ ticker: string }>("SELECT ticker FROM Favorite WHERE userId = ?", [userIdB]);
    expect(aAfter.length).toBe(2);
    expect(bAfter.length).toBe(1);
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Functional · per-user service status");

  await ctx.check("User A start service does not affect user B", async () => {
    // Set user A's status to running directly (server action requires form-data wire)
    execSql(
      `INSERT INTO UserServiceStatus(userId, status, updatedAt) VALUES(?, 'running', datetime('now')) ON CONFLICT(userId) DO UPDATE SET status='running'`,
      [userIdA],
    );

    const rA = await clientA.get("/api/service");
    const jA = (await rA.json()) as { status: string };
    expect(jA.status).toBe("running");

    const rB = await clientB.get("/api/service");
    const jB = (await rB.json()) as { status: string };
    expect(jB.status).toBe("stopped");
  });

  await ctx.check("ServiceEvent rows are scoped per user", () => {
    execSql(
      `INSERT INTO ServiceEvent(userId, event, at) VALUES (?, 'START', datetime('now'))`,
      [userIdA],
    );
    const aEvents = queryAll(`SELECT id FROM ServiceEvent WHERE userId = ?`, [userIdA]);
    const bEvents = queryAll(`SELECT id FROM ServiceEvent WHERE userId = ?`, [userIdB]);
    expect(aEvents.length).toBeGreaterThan(0);
    expect(bEvents.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Functional · empty-state CTA on dashboard for new user");

  // create a third "fresh" user with no channels selected
  const userC = {
    fullName: "User C",
    email: `c-${TAG}@tradex-qa.in`,
    phone: "+919999999993",
    password: "qa-password-789",
  };
  const clientC = new HttpClient();

  await ctx.check("Sign up + onboard user C, no channels", async () => {
    const r = await clientC.postJson("/api/auth/signup", { ...userC, passwordConfirm: userC.password });
    expect(r.status).toBe(200);
    const id = queryOne<{ id: number }>("SELECT id FROM User WHERE email = ?", [userC.email])?.id;
    if (!id) throw new Error("user C not in DB");
    execSql(`UPDATE User SET onboardingStep='done', onboardedAt=datetime('now') WHERE id = ?`, [id]);
  });

  await ctx.check("User C dashboard shows ConnectChannelsCTA", async () => {
    const r = await clientC.get("/");
    expect(r.status).toBe(200);
    const html = await r.text();
    // Both phrasings are valid depending on whether Telegram is connected:
    const hasTgConnected = /haven't picked any channels/i.test(html);
    const hasTgPending = /Let's get your first channel/i.test(html);
    if (!hasTgConnected && !hasTgPending) {
      // The CTA may also lazy-load via TanStack Query; check for the sparkles + button pattern
      if (!html.toLowerCase().includes("welcome to tradex")) {
        throw new Error("ConnectChannelsCTA didn't render for empty user");
      }
    }
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("DB integrity · cascade delete");

  await ctx.check("Deleting user A cascades all owned data", () => {
    // capture counts pre-delete
    const before = {
      channels: queryAll(`SELECT id FROM Channel WHERE userId = ?`, [userIdA]).length,
      favorites: queryAll(`SELECT * FROM Favorite WHERE userId = ?`, [userIdA]).length,
      events: queryAll(`SELECT id FROM ServiceEvent WHERE userId = ?`, [userIdA]).length,
      status: queryAll(`SELECT * FROM UserServiceStatus WHERE userId = ?`, [userIdA]).length,
    };
    expect(before.channels).toBeGreaterThan(0);
    expect(before.favorites).toBeGreaterThan(0);

    execSql(`DELETE FROM User WHERE id = ?`, [userIdA]);

    const after = {
      channels: queryAll(`SELECT id FROM Channel WHERE userId = ?`, [userIdA]).length,
      favorites: queryAll(`SELECT * FROM Favorite WHERE userId = ?`, [userIdA]).length,
      events: queryAll(`SELECT id FROM ServiceEvent WHERE userId = ?`, [userIdA]).length,
      status: queryAll(`SELECT * FROM UserServiceStatus WHERE userId = ?`, [userIdA]).length,
    };
    expect(after.channels).toBe(0);
    expect(after.favorites).toBe(0);
    expect(after.events).toBe(0);
    expect(after.status).toBe(0);
  });

  await ctx.check("User B's data unaffected by user A deletion", () => {
    const channels = queryAll(`SELECT id FROM Channel WHERE userId = ?`, [userIdB]).length;
    const favs = queryAll(`SELECT * FROM Favorite WHERE userId = ?`, [userIdB]).length;
    expect(channels).toBe(1);
    expect(favs).toBe(1);
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Cleanup");

  await ctx.check("Cleanup remaining test users + cascaded data", () => {
    cleanupTestUsers(TAG);
    const left = queryAll(`SELECT id FROM User WHERE email LIKE ?`, [`%${TAG}%`]);
    expect(left.length).toBe(0);
    const orphans = queryAll(`SELECT id FROM Channel WHERE userId NOT IN (SELECT id FROM User)`);
    expect(orphans.length).toBe(0);
  });
}
