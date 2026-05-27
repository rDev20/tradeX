import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAuthScript } from "@/lib/python";
import { markOnboardingDone } from "@/lib/services/onboarding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SubmitResp = {
  ok: boolean;
  needs2FA?: boolean;
  tgUserId?: string;
  firstName?: string;
  username?: string | null;
  sessionPath?: string;
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

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    password?: string;
  };
  const code = (body.code ?? "").trim();
  const password = (body.password ?? "").trim();
  if (!code) return NextResponse.json({ ok: false, error: "CODE_MISSING" }, { status: 400 });

  const account = await db.userTelegramAccount.findUnique({ where: { userId } });
  if (!account || !account.phoneCodeHashTemp) {
    return NextResponse.json(
      { ok: false, error: "NO_PENDING_CODE", message: "Request a new code first." },
      { status: 400 },
    );
  }

  const args = [
    "--user-id",
    String(userId),
    "--phone",
    account.phone,
    "--code",
    code,
    "--phone-code-hash",
    account.phoneCodeHashTemp,
  ];
  if (password) args.push("--password", password);

  const py = await runAuthScript<SubmitResp>("submit", args, 90_000);
  if (!py.ok) {
    return NextResponse.json(
      { ok: false, error: "PYTHON_ERROR", message: py.error, stderr: py.stderr },
      { status: 500 },
    );
  }

  const data = py.data;

  if (!data.ok) {
    if (data.needs2FA) {
      await db.userTelegramAccount.update({
        where: { userId },
        data: { needs2FA: true },
      });
      return NextResponse.json({ ok: false, needs2FA: true });
    }
    return NextResponse.json(
      { ok: false, error: data.error ?? "UNKNOWN", message: data.message },
      { status: 400 },
    );
  }

  // Success — persist Telegram identity, clear transient hash, mark onboarding done
  await db.userTelegramAccount.update({
    where: { userId },
    data: {
      tgUserId: data.tgUserId ?? null,
      tgFirstName: data.firstName ?? null,
      tgUsername: data.username ?? null,
      connectedAt: new Date(),
      phoneCodeHashTemp: null,
      needs2FA: false,
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

  return NextResponse.json({
    ok: true,
    redirect: "/",
    telegram: {
      tgUserId: data.tgUserId,
      firstName: data.firstName,
      username: data.username,
    },
  });
}
