import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { signupUser } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await signupUser({
    fullName: String(body.fullName ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    address: typeof body.address === "string" ? body.address : "",
    password: String(body.password ?? ""),
    passwordConfirm: String(body.passwordConfirm ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        field: result.field,
        capReached: result.capReached ?? false,
      },
      { status: result.capReached ? 403 : 400 },
    );
  }

  await createSession(result.userId);
  return NextResponse.json({ ok: true, redirect: result.redirect, userId: result.userId });
}
