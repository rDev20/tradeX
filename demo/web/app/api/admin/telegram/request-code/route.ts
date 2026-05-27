import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAuthScript } from "@/lib/python";

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
  let admin;
  try {
    admin = await requireAdminUser();
  } catch {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = (body.phone ?? admin.phone ?? "").trim();
  if (!phone) return NextResponse.json({ ok: false, error: "PHONE_MISSING" }, { status: 400 });

  const py = await runAuthScript<RequestResp>("request", [
    "--user-id",
    String(admin.id),
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

  if (data.alreadyAuthorized) {
    await db.userTelegramAccount.upsert({
      where: { userId: admin.id },
      create: {
        userId: admin.id,
        phone,
        tgUserId: data.tgUserId ?? null,
        tgFirstName: data.firstName ?? null,
        tgUsername: data.username ?? null,
        sessionPath: `sessions/user_${admin.id}.session`,
        connectedAt: new Date(),
      },
      update: {
        phone,
        tgUserId: data.tgUserId ?? null,
        tgFirstName: data.firstName ?? null,
        tgUsername: data.username ?? null,
        connectedAt: new Date(),
        phoneCodeHashTemp: null,
        needs2FA: false,
      },
    });
    return NextResponse.json({ ok: true, alreadyAuthorized: true, redirect: "/admin/channels" });
  }

  await db.userTelegramAccount.upsert({
    where: { userId: admin.id },
    create: {
      userId: admin.id,
      phone,
      sessionPath: `sessions/user_${admin.id}.session`,
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
