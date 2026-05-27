import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ total: 0, selected: 0 }, { status: 401 });
  }
  const [total, selected] = await Promise.all([
    db.channel.count({ where: { userId: session.userId } }),
    db.channel.count({ where: { userId: session.userId, selected: true } }),
  ]);
  return NextResponse.json({ total, selected });
}
