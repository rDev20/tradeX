"use client";

import { useQuery } from "@tanstack/react-query";
import { practiceRupee, pct, cn } from "@/lib/utils";

type DashResp = {
  summary: { totalBudget: number; totalPnl: number; todayPnl: number };
  counts: { tradesToday: number; signalsToday: number; messagesToday: number };
};

export function TodaySummary() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      return (await r.json()) as DashResp;
    },
    refetchInterval: 5000,
  });

  const sum = data?.summary;
  const counts = data?.counts;
  const opening = (sum?.totalBudget ?? 0) + ((sum?.totalPnl ?? 0) - (sum?.todayPnl ?? 0));
  const closing = opening + (sum?.todayPnl ?? 0);
  const todayUp = (sum?.todayPnl ?? 0) >= 0;
  const todayPct = opening > 0 ? ((sum?.todayPnl ?? 0) / opening) * 100 : 0;

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] mb-3">
        Today's Practice ₹ Summary
      </h2>
      <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--neutral-800)]">
          <Cell label="Opening balance" value={practiceRupee(opening)} />
          <Cell label="Closing balance" value={practiceRupee(closing)} />
          <Cell
            label="Today's P&L"
            value={practiceRupee(sum?.todayPnl ?? 0, { sign: true })}
            tone={todayUp ? "up" : "down"}
            extra={pct(todayPct)}
          />
          <Cell
            label="Today's flow"
            value={`${counts?.messagesToday ?? 0} → ${counts?.signalsToday ?? 0} → ${counts?.tradesToday ?? 0}`}
            extra="msgs → signals → trades"
          />
        </div>
      </div>
    </section>
  );
}

function Cell({
  label,
  value,
  tone,
  extra,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  extra?: string;
}) {
  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        {label}
      </div>
      <div
        className={cn(
          "text-xl md:text-2xl font-semibold tabular-nums mt-1",
          tone === "up" && "text-[var(--success)]",
          tone === "down" && "text-[var(--danger)]",
          !tone && "text-[var(--neutral-100)]",
        )}
      >
        {value}
      </div>
      {extra && <div className="text-xs text-[var(--neutral-500)] mt-1">{extra}</div>}
    </div>
  );
}
