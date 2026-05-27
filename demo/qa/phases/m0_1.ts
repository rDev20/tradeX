// M0.1 — Auth + Register form QA checks.
// Categories: Static (files, schema, env), Functional (HTTP), DB integrity, Security.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CheckContext, expect } from "../lib/check.js";
import { HttpClient } from "../lib/http.js";
import { queryOne, queryAll, cleanupTestUsers } from "../lib/db.js";

const WEB_DIR = resolve(import.meta.dirname, "../../web");
const TAG = `qa${Date.now().toString(36)}`;

function readFile(rel: string): string {
  return readFileSync(resolve(WEB_DIR, rel), "utf8");
}

function envValue(key: string): string | null {
  const env = readFile(".env");
  const re = new RegExp(`^${key}=["']?([^"'\\n]+)["']?`, "m");
  return env.match(re)?.[1] ?? null;
}

export async function runM0_1(ctx: CheckContext) {
  // ─────────────────────────────────────────────────────────
  ctx.section("Static · schema + files");

  await ctx.check("Prisma schema has User model with required fields", () => {
    const s = readFile("prisma/schema.prisma");
    expect(s.includes("model User")).toBeTruthy();
    for (const f of ["email", "passwordHash", "fullName", "phone", "panEncrypted", "address"]) {
      if (!s.includes(f)) throw new Error(`User model missing field: ${f}`);
    }
    expect(s).toMatch(/email\s+String\s+@unique/);
  });

  await ctx.check("lib/auth.ts exports userId-based session API", () => {
    const s = readFile("lib/auth.ts");
    for (const fn of ["createSession", "readSession", "destroySession", "verifyTokenString", "getCurrentUser", "requireUserId"]) {
      if (!s.includes(`function ${fn}`) && !s.includes(`export async function ${fn}`)) {
        throw new Error(`auth.ts missing export: ${fn}`);
      }
    }
    expect(s.includes("userId")).toBeTruthy();
  });

  await ctx.check("lib/crypto.ts exists with PII encryption", () => {
    const s = readFile("lib/crypto.ts");
    for (const fn of ["encryptPII", "decryptPII", "maskPAN"]) {
      if (!s.includes(fn)) throw new Error(`crypto.ts missing: ${fn}`);
    }
    expect(s).toContain("aes-256-gcm");
  });

  await ctx.check("lib/services/auth.ts has signupUser + loginUser pure functions", () => {
    const s = readFile("lib/services/auth.ts");
    expect(s).toContain("export async function signupUser");
    expect(s).toContain("export async function loginUser");
  });

  await ctx.check("middleware treats /signup and /login as public", () => {
    const s = readFile("middleware.ts");
    expect(s).toContain("/signup");
    expect(s).toContain("/login");
    expect(s).toContain("PUBLIC_PATHS");
  });

  await ctx.check("Signup page + action exist", () => {
    expect(existsSync(resolve(WEB_DIR, "app/signup/page.tsx"))).toBeTruthy();
    expect(existsSync(resolve(WEB_DIR, "app/signup/actions.ts"))).toBeTruthy();
  });

  await ctx.check("API routes /api/auth/signup and /api/auth/login exist", () => {
    expect(existsSync(resolve(WEB_DIR, "app/api/auth/signup/route.ts"))).toBeTruthy();
    expect(existsSync(resolve(WEB_DIR, "app/api/auth/login/route.ts"))).toBeTruthy();
  });

  await ctx.check("Onboarding starts at capabilities", () => {
    expect(existsSync(resolve(WEB_DIR, "app/onboarding/capabilities/page.tsx"))).toBeTruthy();
  });

  await ctx.check("Login uses email + password (not username)", () => {
    const action = readFile("app/login/actions.ts");
    expect(action).toContain("loginUser");
    const page = readFile("app/login/page.tsx");
    expect(page).toContain('name="email"');
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Static · env vars");

  await ctx.check("PII_ENCRYPTION_KEY is set and 64 hex chars", () => {
    const v = envValue("PII_ENCRYPTION_KEY");
    if (!v) throw new Error("PII_ENCRYPTION_KEY not found in demo/web/.env");
    if (!/^[a-f0-9]+$/.test(v)) throw new Error("PII_ENCRYPTION_KEY must be hex");
    expect(v.length).toBe(64);
  });

  await ctx.check("MAX_BETA_USERS is set", () => {
    const v = envValue("MAX_BETA_USERS");
    if (!v) throw new Error("MAX_BETA_USERS not found");
    expect(/^\d+$/.test(v)).toBeTruthy();
  });

  await ctx.check("Stale DEMO_USERNAME / DEMO_PASSWORD removed from .env", () => {
    const env = readFile(".env");
    if (env.includes("DEMO_USERNAME")) throw new Error("DEMO_USERNAME still in .env");
    if (env.includes("DEMO_PASSWORD")) throw new Error("DEMO_PASSWORD still in .env");
  });

  await ctx.check("SESSION_SECRET set and non-trivially long", () => {
    const v = envValue("SESSION_SECRET");
    if (!v) throw new Error("SESSION_SECRET missing");
    expect(v.length).toBeGreaterThan(20);
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Functional · HTTP routing");

  const anon = new HttpClient();

  await ctx.check("GET /login returns 200", async () => {
    const r = await anon.get("/login");
    expect(r.status).toBe(200);
  });

  await ctx.check("GET /signup returns 200", async () => {
    const r = await anon.get("/signup");
    expect(r.status).toBe(200);
  });

  await ctx.check("GET / unauthenticated redirects to /login", async () => {
    const r = await anon.get("/", { followRedirect: false });
    expect(r.status).toBeOneOf([302, 307, 308]);
    expect(r.headers.get("location") ?? "").toContain("/login");
  });

  await ctx.check("Signup form contains public-test fields and no PAN field", async () => {
    const r = await anon.get("/signup");
    const html = await r.text();
    for (const f of ['name="fullName"', 'name="email"', 'name="phone"', 'name="address"', 'name="password"', 'name="passwordConfirm"']) {
      expect(html).toContain(f);
    }
    if (html.includes('name="pan"')) throw new Error("PAN field should not be shown on signup");
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Functional · signup validation (via /api/auth/signup)");

  await ctx.check("Signup with mismatched passwords rejected", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/signup", {
      fullName: "Test User",
      email: `bad-${TAG}@tradex-qa.in`,
      phone: "+919876543210",
      password: "password123",
      passwordConfirm: "different456",
    });
    expect(r.status).toBe(400);
    const json = (await r.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error.toLowerCase()).toContain("password");
  });

  await ctx.check("Signup with phone missing country code rejected", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/signup", {
      fullName: "Test User",
      email: `ph-${TAG}@tradex-qa.in`,
      phone: "9876543210",
      password: "password123",
      passwordConfirm: "password123",
    });
    expect(r.status).toBe(400);
    const json = (await r.json()) as { error: string };
    expect(json.error.toLowerCase()).toContain("phone");
  });

  await ctx.check("Signup with short password rejected", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/signup", {
      fullName: "Test User",
      email: `pwd-${TAG}@tradex-qa.in`,
      phone: "+919876543210",
      password: "short",
      passwordConfirm: "short",
    });
    expect(r.status).toBe(400);
    const json = (await r.json()) as { error: string };
    expect(json.error.toLowerCase()).toContain("8 character");
  });

  await ctx.check("Signup with bad email rejected", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/signup", {
      fullName: "Test User",
      email: "not-an-email",
      phone: "+919876543210",
      password: "password123",
      passwordConfirm: "password123",
    });
    expect(r.status).toBe(400);
    const json = (await r.json()) as { error: string };
    expect(json.error.toLowerCase()).toContain("email");
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Functional · happy-path signup + login");

  const okUser = {
    fullName: "Aman QA",
    email: `aman-${TAG}@tradex-qa.in`,
    phone: "+919876543210",
    address: "MG Road, Bangalore 560001",
    password: "qa-password-123",
  };

  let signupClient: HttpClient;

  await ctx.check("Signup with valid data returns ok + redirect to onboarding", async () => {
    signupClient = new HttpClient();
    const r = await signupClient.postJson("/api/auth/signup", {
      ...okUser,
      passwordConfirm: okUser.password,
    });
    expect(r.status).toBe(200);
    const json = (await r.json()) as { ok: boolean; redirect: string; userId: number };
    expect(json.ok).toBe(true);
    expect(json.redirect).toBe("/onboarding/capabilities");
    expect(typeof json.userId === "number").toBeTruthy();
  });

  await ctx.check("Signup sets tradex_session cookie", () => {
    expect(signupClient.hasCookie("tradex_session")).toBeTruthy();
  });

  await ctx.check("Authenticated incomplete user is sent to onboarding", async () => {
    const r = await signupClient.get("/", { followRedirect: false });
    expect(r.status).toBeOneOf([302, 307, 308]);
    expect(r.headers.get("location") ?? "").toContain("/onboarding/capabilities");
  });

  await ctx.check("Duplicate signup with same email is rejected", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/signup", {
      ...okUser,
      passwordConfirm: okUser.password,
    });
    expect(r.status).toBe(400);
    const json = (await r.json()) as { error: string };
    expect(json.error.toLowerCase()).toContain("exist");
  });

  await ctx.check("Login with correct email + password sets cookie", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/login", {
      email: okUser.email,
      password: okUser.password,
    });
    expect(r.status).toBe(200);
    const json = (await r.json()) as { ok: boolean; redirect: string };
    expect(json.ok).toBe(true);
    expect(json.redirect).toBe("/");
    expect(c.hasCookie("tradex_session")).toBeTruthy();
  });

  await ctx.check("Login with wrong password rejected (401)", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/login", {
      email: okUser.email,
      password: "wrong-password",
    });
    expect(r.status).toBe(401);
    expect(c.hasCookie("tradex_session")).toBeFalsy();
  });

  await ctx.check("Login with unknown email returns same 401 (no enumeration)", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/login", {
      email: `noone-${TAG}@nowhere.in`,
      password: "anything",
    });
    expect(r.status).toBe(401);
    const json = (await r.json()) as { error: string };
    // Error message should be the same as wrong-password to prevent user enumeration
    expect(json.error.toLowerCase()).toContain("invalid");
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("DB integrity");

  await ctx.check("Created user exists in DB with correct email", () => {
    const u = queryOne<{ email: string; fullName: string }>(
      "SELECT email, fullName FROM User WHERE email = ?",
      [okUser.email],
    );
    if (!u) throw new Error("User not found in DB");
    expect(u.email).toBe(okUser.email);
    expect(u.fullName).toBe(okUser.fullName);
  });

  await ctx.check("Password is bcrypt-hashed (not plaintext)", () => {
    const u = queryOne<{ passwordHash: string }>(
      "SELECT passwordHash FROM User WHERE email = ?",
      [okUser.email],
    );
    if (!u) throw new Error("User not found");
    if (u.passwordHash === okUser.password) throw new Error("Password stored as plaintext!");
    expect(u.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
  });

  await ctx.check("PAN is not collected during public-test signup", () => {
    const u = queryOne<{ panEncrypted: string | null }>(
      "SELECT panEncrypted FROM User WHERE email = ?",
      [okUser.email],
    );
    if (!u) throw new Error("User not found");
    expect(u.panEncrypted).toBe(null);
  });

  await ctx.check("Email stored as lowercase", () => {
    const u = queryOne<{ email: string }>(
      "SELECT email FROM User WHERE LOWER(email) = LOWER(?)",
      [okUser.email],
    );
    expect(u?.email).toBe(okUser.email.toLowerCase());
  });

  await ctx.check("lastLoginAt updated after login", () => {
    const u = queryOne<{ lastLoginAt: string | null }>(
      "SELECT lastLoginAt FROM User WHERE email = ?",
      [okUser.email],
    );
    if (!u || !u.lastLoginAt) throw new Error("lastLoginAt is null after login");
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Security");

  await ctx.check("Session cookie is httpOnly + path=/ + sameSite=lax", async () => {
    const c = new HttpClient();
    const r = await c.postJson("/api/auth/login", {
      email: okUser.email,
      password: okUser.password,
    });
    const setCookies = r.headers.getSetCookie?.() ?? [];
    const sess = setCookies.find((sc) => sc.startsWith("tradex_session="));
    if (!sess) throw new Error("tradex_session cookie not set");
    expect(sess.toLowerCase()).toContain("httponly");
    expect(sess.toLowerCase()).toContain("path=/");
    expect(sess.toLowerCase()).toContain("samesite=lax");
  });

  await ctx.check("PII encryption round-trip works", async () => {
    // Set the env var the lib expects
    process.env.PII_ENCRYPTION_KEY = envValue("PII_ENCRYPTION_KEY") ?? "";
    const cryptoPath = resolve(WEB_DIR, "lib/crypto.ts");
    const cryptoUrl = pathToFileURL(cryptoPath).href;
    const mod = (await import(cryptoUrl)) as {
      encryptPII: (s: string) => string;
      decryptPII: (s: string) => string;
    };
    const sample = "ABCDE1234F";
    const enc = mod.encryptPII(sample);
    if (!enc) throw new Error("encryptPII returned empty");
    if (enc === sample) throw new Error("encryption is a no-op");
    expect(mod.decryptPII(enc)).toBe(sample);
  });

  await ctx.check("SESSION_SECRET is not the demo placeholder (production tripwire)", () => {
    const v = envValue("SESSION_SECRET") ?? "";
    if (v.startsWith("demo-")) {
      throw new Error("SESSION_SECRET is still 'demo-...'. ROTATE before VM deploy (M0.6).");
    }
  });

  // ─────────────────────────────────────────────────────────
  ctx.section("Cleanup");

  await ctx.check("Cleanup test users from DB", () => {
    cleanupTestUsers(TAG);
    const left = queryAll(`SELECT id FROM User WHERE email LIKE ?`, [`%${TAG}%`]);
    expect(left.length).toBe(0);
  });
}
