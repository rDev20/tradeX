"use client";

import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";
import Link from "next/link";
import { setServiceStatus } from "@/app/(app)/actions";
import { cn, practiceRupee, relativeTime } from "@/lib/utils";
import { Power, Radio } from "lucide-react";

type ChannelMini = {
  id: number;
  name: string;
  username: string | null;
  todayPnl: number;
  tradesToday: number;
};

type Status = {
  serviceStatus: "running" | "stopped";
  counts: {
    channelsSelected: number;
    messagesToday: number;
    signalsToday: number;
    tradesToday: number;
  };
  lastTickAt: string | null;
  serviceEvent: { type: string; at: string } | null;
  channels: ChannelMini[];
};

export function TradingServiceCard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      return (await r.json()) as Status;
    },
    refetchInterval: 2000,
  });

  const [pending, startTransition] = useTransition();
  const running = data?.serviceStatus === "running";
  const counts = data?.counts;
  const channels = data?.channels ?? [];

  const toggle = () => {
    startTransition(async () => {
      await setServiceStatus(running ? "stopped" : "running");
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        running
          ? "border-[var(--success)]/40 bg-[var(--success)]/5"
          : "border-[var(--neutral-800)] bg-[var(--neutral-900)]",
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
              Trading Service
            </span>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                running
                  ? "bg-[var(--success)]/15 text-[var(--success)]"
                  : "bg-[var(--neutral-800)] text-[var(--neutral-400)]",
              )}
            >
              {running ? (
                <span className="pulse-dot text-[var(--success)]">LIVE · Paper</span>
              ) : (
                "STOPPED"
              )}
            </span>
          </div>
          <div className="text-base font-medium">
            {running
              ? "Ingesting signals from your channels, simulating paper trades"
              : "Service is off — start to begin processing today's signals"}
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={pending}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50",
            running
              ? "bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white"
              : "bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] text-white",
          )}
        >
          <Power size={16} />
          {pending ? "…" : running ? "Stop Service" : "Start Service"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Stat label="Channels" value={`${counts?.channelsSelected ?? 0}`} />
        <Stat label="Messages today" value={`${counts?.messagesToday ?? 0}`} />
        <Stat label="Signals parsed" value={`${counts?.signalsToday ?? 0}`} />
        <Stat label="Paper trades" value={`${counts?.tradesToday ?? 0}`} />
      </div>

      {channels.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[var(--neutral-800)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)] mb-2">
            Watching
          </div>
          <div className="flex flex-wrap gap-2">
            {channels.map((c) => {
              const up = c.todayPnl >= 0;
              return (
                <Link
                  key={c.id}
                  href={`/trading-floor/${c.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-800)] bg-[var(--neutral-900)] hover:border-[var(--neutral-700)] hover:bg-[var(--neutral-800)]/50 px-3 py-1.5 transition"
                >
                  <Radio size={12} className="text-[var(--info)]" />
                  <span className="text-xs font-medium truncate max-w-[140px]">{c.name}</span>
                  {c.username && (
                    <span className="text-[10px] text-[var(--neutral-500)]">@{c.username}</span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] tabular-nums px-1.5 py-0.5 rounded",
                      up
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : "bg-[var(--danger)]/10 text-[var(--danger)]",
                    )}
                  >
                    {practiceRupee(c.todayPnl, { sign: true })} today
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {data?.serviceEvent && (
        <div className="mt-4 text-[11px] text-[var(--neutral-500)]">
          Last event: {data.serviceEvent.type} · {relativeTime(data.serviceEvent.at)}
          {data.lastTickAt && <> · Last price tick {relativeTime(data.lastTickAt)}</>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
