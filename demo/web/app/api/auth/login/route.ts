import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { loginUser } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await loginUser({
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
  }

  await createSession(result.userId);
  return NextResponse.json({ ok: true, redirect: result.redirect, userId: result.userId });
}
