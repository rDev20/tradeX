"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Cpu, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import Link from "next/link";

type Event = {
  type: "MESSAGE" | "SIGNAL" | "TRADE_OPENED" | "TRADE_CLOSED";
  at: string;
  channelId: number | null;
  channelName: string | null;
  text: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
};

export function ActivityFeed() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      const j = await r.json();
      return j as { events: Event[]; serviceStatus: "running" | "stopped" };
    },
    refetchInterval: 5000,
  });

  const events = data?.events ?? [];
  const running = data?.serviceStatus === "running";

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] flex items-center gap-2">
          Live Activity
          {running && (
            <span className="text-[9px] uppercase tracking-widest text-[var(--success)] pulse-dot">
              live
            </span>
          )}
        </h2>
        <span className="text-xs text-[var(--neutral-500)]">last 30 events</span>
      </div>

      <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] divide-y divide-[var(--neutral-800)] max-h-[480px] overflow-auto">
        {events.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--neutral-500)]">
            {running
              ? "Waiting for activity… messages will stream here as they arrive."
              : "No activity yet. Start the Trading Service to begin ingesting signals."}
          </div>
        ) : (
          events.map((e, i) => <EventRow key={`${e.at}-${e.type}-${i}`} event={e} />)
        )}
      </div>
    </section>
  );
}

function EventRow({ event }: { event: Event }) {
  const meta = labelFor(event);
  return (
    <div className="px-4 py-3 flex items-start gap-3 hover:bg-[var(--neutral-800)]/30 transition">
      <div
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
          meta.bg,
          meta.color,
        )}
      >
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            {meta.label}
          </span>
          {event.channelName && event.channelId && (
            <Link
              href={`/trading-floor/${event.channelId}`}
              className="text-xs font-medium text-[var(--tradex-orange-300)] hover:underline truncate max-w-[200px]"
            >
              {event.channelName}
            </Link>
          )}
          <span className="text-[10px] text-[var(--neutral-500)] ml-auto whitespace-nowrap">
            {relativeTime(event.at)}
          </span>
        </div>
        <div
          className={cn(
            "text-sm mt-0.5 whitespace-pre-wrap break-words",
            event.tone === "up" && "text-[var(--success)]",
            event.tone === "down" && "text-[var(--danger)]",
            event.tone === "neutral" && "text-[var(--neutral-200)]",
            !event.tone && "text-[var(--neutral-200)]",
          )}
        >
          {event.text}
        </div>
        {event.sub && (
          <div className="text-[11px] text-[var(--neutral-500)] mt-0.5">{event.sub}</div>
        )}
      </div>
    </div>
  );
}

function labelFor(e: Event) {
  switch (e.type) {
    case "MESSAGE":
      return {
        label: "Telegram",
        icon: <MessageCircle size={14} />,
        bg: "bg-[var(--info)]/15",
        color: "text-[var(--info)]",
      };
    case "SIGNAL":
      return {
        label: "Parsed by AI",
        icon: <Cpu size={14} />,
        bg: "bg-[var(--tradex-orange-500)]/15",
        color: "text-[var(--tradex-orange-300)]",
      };
    case "TRADE_OPENED":
      return {
        label: "Paper trade opened",
        icon: <ArrowUpRight size={14} />,
        bg: "bg-[var(--neutral-700)]",
        color: "text-[var(--neutral-200)]",
      };
    case "TRADE_CLOSED":
      return {
        label: "Paper trade closed",
        icon: <CheckCircle2 size={14} />,
        bg:
          e.tone === "up"
            ? "bg-[var(--success)]/15"
            : "bg-[var(--danger)]/15",
        color: e.tone === "up" ? "text-[var(--success)]" : "text-[var(--danger)]",
      };
  }
}
