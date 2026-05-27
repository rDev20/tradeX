import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({
      telegram: { connected: false, name: null, phone: null, username: null },
      broker: { connected: false, name: "Kite / Upstox / Dhan" },
    });
  }
  const tg = await db.userTelegramAccount.findUnique({ where: { userId: session.userId } });
  return NextResponse.json({
    telegram: {
      connected: !!tg && !!tg.connectedAt,
      name: tg?.tgFirstName ?? null,
      phone: tg?.phone ?? null,
      username: tg?.tgUsername ?? null,
    },
    broker: { connected: false, name: "Kite / Upstox / Dhan" },
  });
}
