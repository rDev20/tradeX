import { db } from "@/lib/db";
import Link from "next/link";
import { practiceRupee, pct } from "@/lib/utils";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { StarRating, computeRating } from "@/components/star-rating";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ScorecardListPage() {
  const userId = await requireUserId();
  const channels = await db.channel.findMany({
    where: { userId, selected: true },
    include: {
      trades: true,
      _count: { select: { signals: true, trades: true } },
    },
  });

  const rows = channels.map((c) => {
    const closed = c.trades.filter((t) => t.closedAt);
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
    const pnl = c.trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    const pnlPct = c.budget > 0 ? (pnl / c.budget) * 100 : 0;
    const rating = computeRating({ pnlPct, winRate, closedTrades: closed.length });
    return {
      id: c.id,
      name: c.name,
      username: c.username,
      budget: c.budget,
      signals: c._count.signals,
      tradesTotal: c._count.trades,
      tradesClosed: closed.length,
      wins,
      losses: closed.length - wins,
      pnl,
      pnlPct,
      winRate,
      rating,
    };
  });

  rows.sort((a, b) => b.pnl - a.pnl);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="brand-orange" size={24} />
          Channel Scorecard
        </h1>
        <p className="text-sm text-[var(--neutral-400)] mt-1">
          Honest paper-trading performance of the Telegram channels you're evaluating. Is that paid
          subscription actually making you money?
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-12 text-center">
          <Trophy className="mx-auto mb-3 text-[var(--neutral-600)]" size={32} />
          <div className="font-medium">No channels under evaluation</div>
          <p className="text-sm text-[var(--neutral-500)] mt-1">
            Go to <Link href="/channels" className="underline">Channels</Link>, pick a few, allocate
            a Practice ₹ budget, and tap Confirm. Scorecards build up as signals are paper-traded.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/scorecard/${r.id}`}
              className="block rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5 hover:border-[var(--neutral-700)] transition"
            >
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold truncate">{r.name}</div>
                    {r.username && (
                      <span className="text-xs text-[var(--neutral-500)]">@{r.username}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <StarRating rating={r.rating.stars} size={14} />
                    <span className="text-xs text-[var(--neutral-400)]">{r.rating.verdict}</span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--neutral-500)]">
                    Budget {practiceRupee(r.budget)} · {r.signals} signals · {r.tradesTotal} paper
                    trades · {r.tradesClosed} closed
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-semibold tabular-nums ${r.pnl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                  >
                    {practiceRupee(r.pnl, { sign: true })}
                  </div>
                  <div className="text-xs text-[var(--neutral-500)] mt-1">
                    {pct(r.pnlPct)} of budget
                  </div>
                  {r.tradesClosed > 0 && (
                    <div className="text-xs text-[var(--neutral-500)] mt-1 flex items-center justify-end gap-2">
                      <TrendingUp size={12} className="text-[var(--success)]" />
                      {r.wins}w
                      <TrendingDown size={12} className="text-[var(--danger)]" />
                      {r.losses}l
                      <span>· {r.winRate.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
