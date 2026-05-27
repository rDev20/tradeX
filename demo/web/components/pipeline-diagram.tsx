"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Cpu, LineChart, ArrowRight } from "lucide-react";
import { practiceRupee, pct } from "@/lib/utils";

type Telegram = {
  connected: boolean;
  name: string | null;
  phone: string | null;
};

type Counts = {
  channelsSelected: number;
  messagesToday: number;
  signalsToday: number;
  tradesToday: number;
};

type Summary = {
  totalBudget: number;
  totalPnl: number;
  todayPnl: number;
};

type DashResp = {
  telegram: Telegram;
  counts: Counts;
  summary: Summary;
  serviceStatus: "running" | "stopped";
};

export function PipelineDiagram() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      return (await r.json()) as DashResp;
    },
    refetchInterval: 5000,
  });

  const tg = data?.telegram;
  const counts = data?.counts;
  const sum = data?.summary;
  const running = data?.serviceStatus === "running";
  const todayPnl = sum?.todayPnl ?? 0;
  const pnlPct = sum && sum.totalBudget > 0 ? (sum.todayPnl / sum.totalBudget) * 100 : 0;
  const tone = todayPnl >= 0 ? "up" : "down";

  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)] mb-4">
        How it flows
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-2 items-stretch">
        <Stage
          label="1. Source"
          subtitle="Your Telegram"
          icon={<MessageCircle size={20} />}
          accent="info"
          rows={[
            tg?.connected
              ? { k: "Account", v: tg.name ?? "Connected" }
              : { k: "Account", v: "Not connected" },
            tg?.phone ? { k: "Phone", v: tg.phone } : null,
            { k: "Channels", v: `${counts?.channelsSelected ?? 0} selected for evaluation` },
          ]}
        />
        <Connector active={running} />
        <Stage
          label="2. Engine"
          subtitle="tradeX AI"
          icon={<Cpu size={20} />}
          accent="brand"
          rows={[
            { k: "Status", v: running ? "Running" : "Idle" },
            { k: "Today", v: `${counts?.messagesToday ?? 0} messages → ${counts?.signalsToday ?? 0} signals` },
            { k: "Parser", v: "heuristic + LLM (when key set)" },
          ]}
        />
        <Connector active={running} />
        <Stage
          label="3. Result"
          subtitle="Paper Trading"
          icon={<LineChart size={20} />}
          accent={tone}
          rows={[
            { k: "Trades today", v: `${counts?.tradesToday ?? 0}` },
            { k: "Today's P&L", v: practiceRupee(todayPnl, { sign: true }), highlight: true, tone },
            { k: "Allocated", v: practiceRupee(sum?.totalBudget ?? 0) },
          ]}
        />
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--neutral-800)] text-xs text-[var(--neutral-500)]">
        Read left to right. Telegram messages flow into the AI engine, which extracts trade signals
        and simulates them on real NSE prices — all in <span className="text-[var(--tradex-orange-300)] font-medium">Practice ₹</span>, no real money.
      </div>
    </div>
  );
}

function Stage({
  label,
  subtitle,
  icon,
  accent,
  rows,
}: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "info" | "brand" | "up" | "down" | "neutral";
  rows: ({ k: string; v: string; highlight?: boolean; tone?: "up" | "down" } | null)[];
}) {
  const colors = {
    info: { bg: "bg-[var(--info)]/10", border: "border-[var(--info)]/30", icon: "text-[var(--info)]" },
    brand: {
      bg: "bg-[var(--tradex-orange-500)]/10",
      border: "border-[var(--tradex-orange-500)]/30",
      icon: "text-[var(--tradex-orange-500)]",
    },
    up: { bg: "bg-[var(--success)]/10", border: "border-[var(--success)]/30", icon: "text-[var(--success)]" },
    down: { bg: "bg-[var(--danger)]/10", border: "border-[var(--danger)]/30", icon: "text-[var(--danger)]" },
    neutral: { bg: "bg-[var(--neutral-800)]/40", border: "border-[var(--neutral-700)]", icon: "text-[var(--neutral-400)]" },
  }[accent];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4 flex flex-col`}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded-lg bg-[var(--neutral-900)] flex items-center justify-center ${colors.icon}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            {label}
          </div>
          <div className="text-sm font-semibold truncate">{subtitle}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.filter(Boolean).map((row, i) => {
          if (!row) return null;
          const tone =
            row.tone === "up"
              ? "text-[var(--success)]"
              : row.tone === "down"
                ? "text-[var(--danger)]"
                : "text-[var(--neutral-100)]";
          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-wider text-[var(--neutral-500)]">
                {row.k}
              </span>
              <span
                className={`text-xs tabular-nums truncate ${row.highlight ? "font-semibold" : ""} ${row.highlight ? tone : "text-[var(--neutral-200)]"}`}
              >
                {row.v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center md:px-1">
      <ArrowRight
        size={20}
        className={
          active ? "text-[var(--tradex-orange-500)]" : "text-[var(--neutral-700)]"
        }
      />
    </div>
  );
}
