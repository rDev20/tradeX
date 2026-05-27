import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "demo-session-secret-tradex-2026-rotate-in-prod",
);
const COOKIE = "tradex_session";

export type UserRole = "admin" | "user";
export type SessionPayload = { userId: number };

export async function createSession(userId: number) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const c = (await cookies()).get(COOKIE);
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c.value, SECRET);
    if (typeof payload.userId !== "number") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function verifyTokenString(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.userId !== "number") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

/** Server-component / server-action helper. Returns the current user or null. */
export async function getCurrentUser() {
  const session = await readSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
}

/** Throws (via redirect-style) if no session. Use in server components. */
export async function requireUserId(): Promise<number> {
  const session = await readSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session.userId;
}

export async function requireAdminUser() {
  const session = await readSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
