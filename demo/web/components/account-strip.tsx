"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, TrendingUp, ChevronRight, Check } from "lucide-react";

type AccountsResp = {
  telegram: { connected: boolean; name: string | null; phone: string | null; username: string | null };
  broker: { connected: boolean; name: string };
};

export function AccountStrip() {
  const { data } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const r = await fetch("/api/accounts");
      return (await r.json()) as AccountsResp;
    },
    refetchInterval: 30000,
  });
  const tg = data?.telegram;

  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] divide-x divide-[var(--neutral-800)] grid grid-cols-1 md:grid-cols-2">
      <Link
        href="/connections"
        className="flex items-center gap-3 p-4 hover:bg-[var(--neutral-800)]/40 transition group"
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--info)]/15 text-[var(--info)] flex items-center justify-center shrink-0">
          <MessageCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
              Telegram
            </span>
            {tg?.connected && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--success)]">
                <Check size={10} /> Connected
              </span>
            )}
          </div>
          <div className="text-sm font-semibold truncate mt-0.5">
            {tg?.name ?? (tg?.connected ? "Connected" : "Not connected")}
          </div>
          <div className="text-[11px] text-[var(--neutral-500)] truncate">
            {tg?.username ? `@${tg.username} · ` : ""}{tg?.phone ?? "—"}
          </div>
        </div>
        <ChevronRight size={14} className="text-[var(--neutral-600)] group-hover:text-[var(--neutral-300)]" />
      </Link>

      <Link
        href="/connections"
        className="flex items-center gap-3 p-4 hover:bg-[var(--neutral-800)]/40 transition group"
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--neutral-800)] text-[var(--neutral-500)] flex items-center justify-center shrink-0">
          <TrendingUp size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
              Broker
            </span>
            <span className="text-[10px] text-[var(--neutral-500)]">Phase 2</span>
          </div>
          <div className="text-sm font-semibold truncate mt-0.5 text-[var(--neutral-400)]">
            Not connected
          </div>
          <div className="text-[11px] text-[var(--neutral-500)] truncate">
            Kite · Upstox · Dhan · Fyers
          </div>
        </div>
        <ChevronRight size={14} className="text-[var(--neutral-600)] group-hover:text-[var(--neutral-300)]" />
      </Link>
    </div>
  );
}
