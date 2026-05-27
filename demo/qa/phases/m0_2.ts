// M0.2 — Onboarding wizard QA checks.
// Categories: Static (files, schema, services), Functional (HTTP routing), Flow (state-machine), DB integrity.
//
// Notes:
// - Telegram OTP itself can't be QA'd without sending real codes — we verify the routes
//   exist and respond correctly to bad inputs, but the full happy path is manual / browser.
// - The old quiz step was removed for public testing. This phase verifies that signup
//   lands directly on capabilities, then Telegram.

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

export async function runM0_2(ctx: CheckContext) {
  // ─────────────────────────────────────────────────────────
  ctx.section("Static · schema + services");

  await ctx.check("User schema has onboardingStep + onboardedAt", () => {
    const s = readFile("prisma/schema.prisma");
    expect(s).toContain("onboardingStep");
    expect(s).toContain("onboardedAt");
  });

  await ctx.check("UserTelegramAccount model exists with required fields", () => {
    const s = readFile("prisma/schema.prisma");
    expect(s).toContain("model UserTelegramAccount");
    for (const f of ["userId", "phone", "tgUserId", "tgFirstName", "tgUsername", "sessionPath", "phoneCodeHashTemp", "needs2FA"]) {
      if (!s.includes(f)) throw new Error(`UserTelegramAccount missing field: ${f}`);
    }
  });

  await ctx.check("lib/services/onboarding.ts exposes state-machine API", () => {
    const s = readFile("lib/services/onboarding.ts");
    for (const fn of ["advanceToTelegram", "markOnboardingDone", "pathForStep", "isValidStep"]) {
      if (!s.includes(fn)) throw new Error(`onboarding service missing export: ${fn}`);
    }
    expect(s).toContain("ONBOARDING_STEPS");
    if (s.includes('"quiz"')) throw new Error("quiz should not be an active onboarding step");
  });

  await ctx.check("lib/python.ts exists with runAuthScript helper", () => {
    const s = readFile("lib/python.ts");
    expect(s).toContain("runAuthScript");
    expect(s).toContain("spawn");
  });

  await ctx.check("All onboarding pages exist", () => {
    const pages = [
      "app/onboarding/layout.tsx",
      "app/onboarding/capabilities/page.tsx",
      "app/onboarding/capabilities/actions.ts",
      "app/onboarding/telegram/page.tsx",
      "app/onboarding/telegram/telegram-connect-flow.tsx",
    ];
    for (const p of pages) {
      if (!existsSync(resolve(WEB_DIR, p))) throw new Error(`Missing: ${p}`);
    }
  });

  await ctx.check("Telegram OTP API routes exist", () => {
    expect(existsSync(resolve(WEB_DIR, "app/api/onboarding/telegram/request-code/route.ts"))).toBeTruthy();
    expect(existsSync(resolve(WEB_DIR, "app/api/onboarding/telegram/submit-code/route.ts"))).toBeTruthy();
  });

  await ctx.check("worker/auth.py supports multi-user CLI", () => {
    const s = readFileSync(resolve(WEB_DIR, "../worker/auth.py"), "utf8");
    expect(s).toContain("--user-id");
    expect(s).toContain("--phone");
    expect(s).toContain("def cmd_request");
    expect(s).toContain("def cmd_submit");
    expect(s).toContain("def cmd_status");
    expect(s).toContain("def cmd_disconnect");
  });

  await ctx.check("(app) layout enforces onboarding gate", () => {
    const s = readFile("app/(app)/layout.tsx");
    expect(s).toContain("onboardedAt");
    expect(s).toContain("pathForStep");
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Functional · onboarding pages render (authenticated)");

  // Create a test user via /api/auth/signup, then we have a session cookie
  const client = new HttpClient();
  const okUser = {
    fullName: "Onboarding QA",
    email: `ob-${TAG}@tradex-qa.in`,
    phone: "+919876543210",
    pan: "",
    address: "",
    password: "qa-password-123",
  };

  await ctx.check("Create test user via /api/auth/signup (setup)", async () => {
    const r = await client.postJson("/api/auth/signup", { ...okUser, passwordConfirm: okUser.password });
    expect(r.status).toBe(200);
    expect(client.hasCookie("tradex_session")).toBeTruthy();
  });

  await ctx.check("New user lands on capabilities step", () => {
    const u = queryOne<{ onboardingStep: string; onboardedAt: string | null }>(
      "SELECT onboardingStep, onboardedAt FROM User WHERE email = ?",
      [okUser.email],
    );
    expect(u?.onboardingStep).toBe("capabilities");
    expect(u?.onboardedAt).toBe(null);
  });

  await ctx.check("Authed user hitting / is redirected to /onboarding/capabilities", async () => {
    const r = await client.get("/", { followRedirect: false });
    expect(r.status).toBeOneOf([302, 307, 308]);
    expect(r.headers.get("location") ?? "").toContain("/onboarding/capabilities");
  });

  await ctx.check("GET /onboarding/capabilities renders the first step", async () => {
    const r = await client.get("/onboarding/capabilities");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html.toLowerCase()).toContain("four things");
    expect(html.toLowerCase()).toContain("connect your telegram");
    expect(html).toMatch(/step\s*(?:<!--[^>]*-->\s*)?1\s*(?:<!--[^>]*-->\s*)?of\s*2/i);
  });

  await ctx.check("User on capabilities cannot skip ahead to /onboarding/telegram", async () => {
    const r = await client.get("/onboarding/telegram", { followRedirect: false });
    expect(r.status).toBeOneOf([302, 307, 308]);
    expect(r.headers.get("location") ?? "").toContain("/onboarding/capabilities");
  });

  await ctx.check("Legacy /onboarding/quiz URL redirects to capabilities", async () => {
    const r = await client.get("/onboarding/quiz", { followRedirect: false });
    expect(r.status).toBeOneOf([302, 307, 308]);
    expect(r.headers.get("location") ?? "").toContain("/onboarding/capabilities");
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Flow · step transitions (via direct service / DB)");

  const userId = queryOne<{ id: number }>("SELECT id FROM User WHERE email = ?", [okUser.email])?.id;
  if (!userId) throw new Error("Setup: user not found");

  await ctx.check("Legacy users saved at quiz are treated as capabilities", async () => {
    execSql(`UPDATE User SET onboardingStep='quiz' WHERE id = ?`, [userId]);
    const r = await client.get("/", { followRedirect: false });
    expect(r.status).toBeOneOf([302, 307, 308]);
    expect(r.headers.get("location") ?? "").toContain("/onboarding/capabilities");
    execSql(`UPDATE User SET onboardingStep='capabilities' WHERE id = ?`, [userId]);
  });

  await ctx.check("Capabilities page loads as first step", async () => {
    const r = await client.get("/onboarding/capabilities");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html.toLowerCase()).toContain("connect your telegram");
    expect(html).toMatch(/step\s*(?:<!--[^>]*-->\s*)?1\s*(?:<!--[^>]*-->\s*)?of\s*2/i);
  });

  await ctx.check("From capabilities, /onboarding/telegram is reachable (forward via gate)", async () => {
    execSql(`UPDATE User SET onboardingStep='telegram' WHERE id = ?`, [userId]);
    const r = await client.get("/onboarding/telegram");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html.toLowerCase()).toContain("connect your telegram");
    expect(html).toMatch(/step\s*(?:<!--[^>]*-->\s*)?2\s*(?:<!--[^>]*-->\s*)?of\s*2/i);
  });

  await ctx.check("After onboardedAt set, / is reachable (no more redirect to onboarding)", async () => {
    execSql(
      `UPDATE User SET onboardingStep='done', onboardedAt=datetime('now') WHERE id = ?`,
      [userId],
    );
    const r = await client.get("/", { followRedirect: false });
    expect(r.status).toBe(200);
  });

  await ctx.check("After done, /onboarding/capabilities redirects to /", async () => {
    const r = await client.get("/onboarding/capabilities", { followRedirect: false });
    expect(r.status).toBeOneOf([302, 307, 308]);
    expect(r.headers.get("location") ?? "").toContain("/");
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Functional · Telegram OTP routes guard rails");

  // Reset to telegram step for these checks
  execSql(`UPDATE User SET onboardingStep='telegram', onboardedAt=NULL WHERE id = ?`, [userId]);

  await ctx.check("Submit-code with no pending request returns NO_PENDING_CODE", async () => {
    // Ensure no telegram account row yet
    execSql(`DELETE FROM UserTelegramAccount WHERE userId = ?`, [userId]);
    const r = await client.postJson("/api/onboarding/telegram/submit-code", { code: "12345" });
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: string };
    expect(j.error).toBe("NO_PENDING_CODE");
  });

  await ctx.check("Submit-code without code returns CODE_MISSING", async () => {
    const r = await client.postJson("/api/onboarding/telegram/submit-code", {});
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: string };
    expect(j.error).toBe("CODE_MISSING");
  });

  await ctx.check("Unauthenticated POST to request-code returns 401", async () => {
    const anon = new HttpClient();
    const r = await anon.postJson("/api/onboarding/telegram/request-code", { phone: "+919999999999" });
    expect(r.status).toBe(401);
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("DB integrity");

  await ctx.check("Removed quiz fields are not required for onboarding", () => {
    const u = queryOne<{ riskCapital: string | null; riskFrequency: string | null; riskTolerance: string | null }>(
      "SELECT riskCapital, riskFrequency, riskTolerance FROM User WHERE id = ?",
      [userId],
    );
    expect(u?.riskCapital ?? null).toBe(null);
    expect(u?.riskFrequency ?? null).toBe(null);
    expect(u?.riskTolerance ?? null).toBe(null);
  });

  await ctx.check("ONBOARDING_STEPS has done as final step", () => {
    const s = readFile("lib/services/onboarding.ts");
    expect(s).toMatch(/ONBOARDING_STEPS\s*=\s*\[[^\]]*"done"[^\]]*\]/);
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Cleanup");

  await ctx.check("Cleanup test users (and their telegram accounts via cascade)", () => {
    cleanupTestUsers(TAG);
    const left = queryAll(`SELECT id FROM User WHERE email LIKE ?`, [`%${TAG}%`]);
    expect(left.length).toBe(0);
    const orphans = queryAll(`SELECT id FROM UserTelegramAccount WHERE userId NOT IN (SELECT id FROM User)`);
    expect(orphans.length).toBe(0);
  });
}
