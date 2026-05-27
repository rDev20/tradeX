import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_SYMBOLS } from "@/lib/symbols";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  const userId = session?.userId ?? null;

  const symbols = await db.symbol.findMany();
  const favorites = userId
    ? await db.favorite.findMany({ where: { userId }, orderBy: { position: "asc" } })
    : [];
  const favSet = new Set(favorites.map((f) => f.ticker));

  const ticksByTicker = new Map<string, { price: number; change: number | null; at: Date }[]>();

  for (const s of DEMO_SYMBOLS) {
    const ticks = await db.priceTick.findMany({
      where: { ticker: s.ticker },
      orderBy: { at: "desc" },
      take: 60,
    });
    ticksByTicker.set(
      s.ticker,
      ticks.map((t) => ({ price: t.price, change: t.change, at: t.at })),
    );
  }

  const rows = DEMO_SYMBOLS.map((s) => {
    const t = ticksByTicker.get(s.ticker) ?? [];
    const last = t[0];
    const sparkline = t.slice().reverse().map((x) => x.price);
    return {
      ticker: s.ticker,
      displayName: s.displayName,
      kind: s.kind,
      exchange: s.exchange,
      sector: s.sector,
      ltp: last?.price ?? null,
      change: last?.change ?? null,
      at: last?.at ?? null,
      favorite: favSet.has(s.ticker),
      sparkline,
    };
  });

  const lastTick = await db.priceTick.findFirst({ orderBy: { at: "desc" } });

  return NextResponse.json({
    symbols: rows,
    registeredCount: symbols.length,
    lastTickAt: lastTick?.at ?? null,
    source: "Yahoo Finance via yfinance",
  });
}
