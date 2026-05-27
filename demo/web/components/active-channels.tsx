"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Radio, ArrowUpRight } from "lucide-react";
import { channelHealthLabel } from "@/lib/dashboard-guidance";
import { practiceRupee, relativeTime, cn } from "@/lib/utils";

type ChannelCard = {
  id: number;
  name: string;
  username: string | null;
  budget: number;
  tradesTotal: number;
  tradesToday: number;
  todayPnl: number;
  lifetimePnl: number;
  messages: number;
  signals: number;
  lastActivityAt: string | null;
};

export function ActiveChannels() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      const j = await r.json();
      return j as { channels: ChannelCard[] };
    },
    refetchInterval: 5000,
  });
  const channels = data?.channels ?? [];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)]">
          Active Channels
        </h2>
        <Link
          href="/channels"
          className="text-xs text-[var(--neutral-400)] hover:text-[var(--tradex-orange-300)] flex items-center gap-1"
        >
          Manage <ArrowUpRight size={12} />
        </Link>
      </div>
      {channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--neutral-800)] bg-[var(--neutral-900)]/50 p-8 text-center">
          <Radio className="mx-auto mb-3 text-[var(--neutral-600)]" size={28} />
          <div className="text-sm font-medium">No channels under evaluation yet</div>
          <p className="text-xs text-[var(--neutral-500)] mt-1">
            Go to <Link href="/channels" className="underline">Channels</Link>, pick 1-3 from your
            Telegram, and allocate a Practice ₹ budget for each.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map((c) => {
            const todayUp = c.todayPnl >= 0;
            const health = channelHealthLabel(c);
            return (
              <Link
                key={c.id}
                href={`/trading-floor/${c.id}`}
                className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4 hover:border-[var(--neutral-700)] transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--info)]/10 text-[var(--info)] flex items-center justify-center shrink-0">
                    <Radio size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate group-hover:text-[var(--tradex-orange-500)]">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-[var(--neutral-500)] truncate">
                      {c.username ? `@${c.username}` : "channel"} · budget {practiceRupee(c.budget)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
                      Today
                    </div>
                    <div
                      className={cn(
                        "text-sm font-semibold tabular-nums mt-0.5",
                        todayUp ? "text-[var(--success)]" : "text-[var(--danger)]",
                      )}
                    >
                      {practiceRupee(c.todayPnl, { sign: true })}
                    </div>
                    <div className="text-[10px] text-[var(--neutral-500)]">
                      {c.tradesToday} {c.tradesToday === 1 ? "trade" : "trades"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
                      Lifetime
                    </div>
                    <div
                      className={cn(
                        "text-sm font-semibold tabular-nums mt-0.5",
                        c.lifetimePnl >= 0
                          ? "text-[var(--success)]"
                          : "text-[var(--danger)]",
                      )}
                    >
                      {practiceRupee(c.lifetimePnl, { sign: true })}
                    </div>
                    <div className="text-[10px] text-[var(--neutral-500)]">
                      {c.tradesTotal} total
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--neutral-800)] pt-3 text-[10px] text-[var(--neutral-500)]">
                  <span>{c.lastActivityAt ? `Last trade ${relativeTime(c.lastActivityAt)}` : "Watch live execution"}</span>
                  <span className="rounded-full bg-[var(--neutral-800)] px-2 py-0.5 text-[var(--neutral-300)]">
                    {health}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
