// Pure auth logic — no Next.js, no cookies, no redirects.
// Server actions and API routes both delegate here. Easy to unit-test.

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const ADMIN_PHONE = "+919811856777";
const ADMIN_NAME = "Karaan Bansall";

// Phone must include the leading "+" and country code (E.164-like, e.g. +919876543210)
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignupField =
  | "fullName"
  | "email"
  | "phone"
  | "address"
  | "password"
  | "passwordConfirm"
  | "form";

export type SignupInput = {
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  password: string;
  passwordConfirm: string;
};

export type SignupResult =
  | { ok: true; userId: number; redirect: string }
  | { ok: false; error: string; field: SignupField; capReached?: boolean };

export async function signupUser(raw: SignupInput): Promise<SignupResult> {
  const fullName = (raw.fullName ?? "").trim();
  const email = (raw.email ?? "").trim().toLowerCase();
  const phone = (raw.phone ?? "").trim();
  const address = (raw.address ?? "").trim();
  const password = raw.password ?? "";
  const passwordConfirm = raw.passwordConfirm ?? "";

  if (!fullName || fullName.length < 2)
    return { ok: false, field: "fullName", error: "Please enter your full name." };
  if (!email || !EMAIL_REGEX.test(email))
    return { ok: false, field: "email", error: "Invalid email address." };
  if (!phone || !PHONE_REGEX.test(phone))
    return {
      ok: false,
      field: "phone",
      error: "Phone must be in international format (e.g. +919876543210).",
    };
  if (password.length < 8)
    return { ok: false, field: "password", error: "Password must be at least 8 characters." };
  if (password !== passwordConfirm)
    return { ok: false, field: "passwordConfirm", error: "Passwords do not match." };
  const role = phone === ADMIN_PHONE ? "admin" : "user";

  // Beta cap
  const cap = Number(process.env.MAX_BETA_USERS ?? "10");
  const existingCount = await db.user.count();
  if (role !== "admin" && existingCount >= cap) {
    return { ok: false, field: "form", error: "Closed beta is full.", capReached: true };
  }

  // Email uniqueness
  const dup = await db.user.findUnique({ where: { email } });
  if (dup)
    return { ok: false, field: "email", error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      fullName: role === "admin" ? ADMIN_NAME : fullName,
      phone,
      role,
      address: address || null,
      onboardedAt: role === "user" ? new Date() : null,
      onboardingStep: role === "user" ? "done" : "telegram",
      tradePlan: role === "user" ? { create: { minFund: 10000, lots: 1 } } : undefined,
    },
  });

  return { ok: true, userId: user.id, redirect: role === "admin" ? "/admin" : "/trading-floor" };
}

export type LoginInput = { email: string; password: string };
export type LoginResult =
  | { ok: true; userId: number; redirect: string }
  | { ok: false; error: string };

export async function loginUser(raw: LoginInput): Promise<LoginResult> {
  const email = (raw.email ?? "").trim().toLowerCase();
  const password = raw.password ?? "";

  if (!email || !password) return { ok: false, error: "Invalid email or password." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "Invalid email or password." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { ok: false, error: "Invalid email or password." };

  if (user.phone === ADMIN_PHONE && user.role !== "admin") {
    await db.user.update({
      where: { id: user.id },
      data: { role: "admin", fullName: ADMIN_NAME, onboardingStep: "telegram" },
    });
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const role = user.phone === ADMIN_PHONE ? "admin" : user.role;
  return { ok: true, userId: user.id, redirect: role === "admin" ? "/admin" : "/trading-floor" };
}
