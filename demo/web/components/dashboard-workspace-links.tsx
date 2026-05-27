"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Briefcase, LineChart } from "lucide-react";
import { practiceRupee, relativeTime } from "@/lib/utils";

type DashResp = {
  serviceStatus: "running" | "stopped";
  counts: { channelsSelected: number; tradesToday: number };
  summary: { totalPnl: number; todayPnl: number };
  lastTickAt: string | null;
};

export function DashboardWorkspaceLinks() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      return (await r.json()) as DashResp;
    },
    refetchInterval: 5000,
  });

  const live = data?.serviceStatus === "running";

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
      <Link
        href="/trading-floor"
        className="group rounded-xl border border-[var(--tradex-orange-500)]/35 bg-[var(--tradex-orange-500)]/10 p-4 transition hover:border-[var(--tradex-orange-500)]/70"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tradex-orange-500)] text-white">
            <Activity size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--tradex-orange-300)]">
              {live && <span className="pulse-dot text-[var(--success)]">live</span>}
              Trading Floor
            </div>
            <div className="mt-1 text-base font-semibold">Watch trades happen in real action</div>
            <div className="mt-1 text-xs text-[var(--neutral-400)]">
              {data?.counts.channelsSelected ?? 0} channels · {data?.counts.tradesToday ?? 0} paper trades today
            </div>
          </div>
          <ArrowRight size={15} className="text-[var(--neutral-500)] transition group-hover:translate-x-0.5 group-hover:text-[var(--neutral-100)]" />
        </div>
      </Link>

      <Link
        href="/market"
        className="group rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4 transition hover:border-[var(--neutral-700)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--info)]/15 text-[var(--info)]">
            <LineChart size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">Market</div>
            <div className="mt-1 text-sm font-semibold">Open market board</div>
            <div className="mt-1 text-xs text-[var(--neutral-500)]">
              {data?.lastTickAt ? `Last tick ${relativeTime(data.lastTickAt)}` : "Waiting for price ticks"}
            </div>
          </div>
        </div>
      </Link>

      <Link
        href="/portfolio"
        className="group rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4 transition hover:border-[var(--neutral-700)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--neutral-800)] text-[var(--neutral-300)]">
            <Briefcase size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">Holdings</div>
            <div className="mt-1 text-sm font-semibold">{practiceRupee(data?.summary.todayPnl ?? 0, { sign: true })} today</div>
            <div className="mt-1 text-xs text-[var(--neutral-500)]">Paper holdings and closed trades</div>
          </div>
        </div>
      </Link>
    </section>
  );
}
