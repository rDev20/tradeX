import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAuthScript } from "@/lib/python";
import { markOnboardingDone } from "@/lib/services/onboarding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RequestResp = {
  ok: boolean;
  alreadyAuthorized?: boolean;
  phoneCodeHash?: string;
  tgUserId?: string;
  firstName?: string;
  username?: string | null;
  error?: string;
  message?: string;
};

export async function POST(req: NextRequest) {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ ok: false, error: "NO_USER" }, { status: 404 });

  const phone = (body.phone ?? user.phone ?? "").trim();
  if (!phone) return NextResponse.json({ ok: false, error: "PHONE_MISSING" }, { status: 400 });

  const py = await runAuthScript<RequestResp>("request", [
    "--user-id",
    String(userId),
    "--phone",
    phone,
  ]);

  if (!py.ok) {
    return NextResponse.json(
      { ok: false, error: "PYTHON_ERROR", message: py.error, stderr: py.stderr },
      { status: 500 },
    );
  }

  const data = py.data;
  if (!data.ok) {
    return NextResponse.json(
      { ok: false, error: data.error ?? "UNKNOWN", message: data.message },
      { status: 400 },
    );
  }

  // If already authorized (rare — user re-signs up with same phone after disconnect), persist immediately.
  if (data.alreadyAuthorized) {
    await db.userTelegramAccount.upsert({
      where: { userId },
      create: {
        userId,
        phone,
        tgUserId: data.tgUserId ?? null,
        tgFirstName: data.firstName ?? null,
        tgUsername: data.username ?? null,
        sessionPath: `sessions/user_${userId}.session`,
        connectedAt: new Date(),
      },
      update: {
        phone,
        tgUserId: data.tgUserId ?? null,
        tgFirstName: data.firstName ?? null,
        tgUsername: data.username ?? null,
        connectedAt: new Date(),
        phoneCodeHashTemp: null,
      },
    });
    await markOnboardingDone(userId);
    await db.userServiceStatus.upsert({
      where: { userId },
      create: { userId, status: "running" },
      update: { status: "running" },
    });
    await db.serviceEvent.create({
      data: { userId, event: "START", note: "Auto-started after Telegram connect" },
    });
    return NextResponse.json({ ok: true, alreadyAuthorized: true, redirect: "/" });
  }

  // Persist phoneCodeHash so submit-code can use it
  await db.userTelegramAccount.upsert({
    where: { userId },
    create: {
      userId,
      phone,
      sessionPath: `sessions/user_${userId}.session`,
      phoneCodeHashTemp: data.phoneCodeHash,
      phoneCodeRequestedAt: new Date(),
    },
    update: {
      phone,
      phoneCodeHashTemp: data.phoneCodeHash,
      phoneCodeRequestedAt: new Date(),
      needs2FA: false,
    },
  });

  return NextResponse.json({ ok: true, codeSent: true });
}
