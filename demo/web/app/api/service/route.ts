import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json(
      { status: "stopped", channelsSelected: 0, messagesToday: 0, signalsToday: 0, tradesToday: 0, lastTickAt: null, lastEventAt: null, lastEventType: null },
      { status: 401 },
    );
  }
  const userId = session.userId;

  const [statusRow, channelsSelected, messagesToday, signalsToday, tradesToday, lastTick, lastEvent] =
    await Promise.all([
      db.userServiceStatus.findUnique({ where: { userId } }),
      db.channel.count({ where: { userId, selected: true } }),
      db.message.count({
        where: { userId, postedAt: { gte: startOfToday() }, channel: { selected: true } },
      }),
      db.parsedSignal.count({
        where: { userId, parsedAt: { gte: startOfToday() }, channel: { selected: true } },
      }),
      db.paperTrade.count({
        where: { userId, signal: { parsedAt: { gte: startOfToday() } }, channel: { selected: true } },
      }),
      db.priceTick.findFirst({ orderBy: { at: "desc" } }),
      db.serviceEvent.findFirst({ where: { userId }, orderBy: { at: "desc" } }),
    ]);

  return NextResponse.json({
    status: statusRow?.status ?? "stopped",
    channelsSelected,
    messagesToday,
    signalsToday,
    tradesToday,
    lastTickAt: lastTick?.at ?? null,
    lastEventAt: lastEvent?.at ?? null,
    lastEventType: lastEvent?.event ?? null,
  });
}

function startOfToday() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs);
  const istMidnight = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0),
  );
  return new Date(istMidnight.getTime() - istOffsetMs);
}
