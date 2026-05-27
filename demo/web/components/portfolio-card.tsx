"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import { practiceRupee, pct, cn } from "@/lib/utils";

type DashResp = {
  summary: { totalBudget: number; totalPnl: number; todayPnl: number };
  counts: { tradesToday: number; channelsSelected: number };
  channels: { lifetimePnl: number; tradesTotal: number }[];
};

export function PortfolioCard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      return (await r.json()) as DashResp;
    },
    refetchInterval: 5000,
  });

  const sum = data?.summary ?? { totalBudget: 0, totalPnl: 0, todayPnl: 0 };
  const portfolioValue = sum.totalBudget + sum.totalPnl;
  const opening = portfolioValue - sum.todayPnl;
  const todayUp = sum.todayPnl >= 0;
  const lifetimeUp = sum.totalPnl >= 0;
  const todayPct = opening > 0 ? (sum.todayPnl / opening) * 100 : 0;
  const lifetimePct = sum.totalBudget > 0 ? (sum.totalPnl / sum.totalBudget) * 100 : 0;

  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-gradient-to-br from-[var(--neutral-900)] to-[var(--neutral-950)] p-6">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
          Portfolio Value · Practice ₹
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
          {data?.counts?.channelsSelected ?? 0} channels ·{" "}
          {data?.channels?.reduce((s, c) => s + c.tradesTotal, 0) ?? 0} trades
        </span>
      </div>
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-4xl md:text-5xl font-semibold tabular-nums tracking-tight">
            {practiceRupee(portfolioValue)}
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
                todayUp
                  ? "text-[var(--success)] bg-[var(--success)]/10"
                  : "text-[var(--danger)] bg-[var(--danger)]/10",
              )}
            >
              {todayUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {practiceRupee(sum.todayPnl, { sign: true })} ({pct(todayPct)})
              <span className="text-[10px] uppercase tracking-widest opacity-70 ml-1">today</span>
            </div>
            <span className="text-xs text-[var(--neutral-500)]">·</span>
            <span
              className={cn(
                "text-sm tabular-nums",
                lifetimeUp ? "text-[var(--success)]" : "text-[var(--danger)]",
              )}
            >
              {practiceRupee(sum.totalPnl, { sign: true })} ({pct(lifetimePct)})
              <span className="text-[10px] uppercase tracking-widest opacity-70 ml-1">all-time</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            Today's open
          </div>
          <div className="text-base tabular-nums mt-0.5">{practiceRupee(opening)}</div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)] mt-2">
            Allocated budget
          </div>
          <div className="text-base tabular-nums mt-0.5">{practiceRupee(sum.totalBudget)}</div>
        </div>
      </div>
    </div>
  );
}
