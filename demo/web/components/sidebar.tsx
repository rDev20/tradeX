"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Activity, LayoutDashboard, Radio, Trophy, Plug, MessageCircle, TrendingUp, Check } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trading-floor", label: "Trading Floor", icon: Activity },
  { href: "/channels", label: "Channels", icon: Radio },
  { href: "/scorecard", label: "Scorecard", icon: Trophy },
  { href: "/connections", label: "Connections", icon: Plug },
];

type AccountsResp = {
  telegram: {
    connected: boolean;
    name: string | null;
    phone: string | null;
    username: string | null;
  };
  broker: { connected: boolean; name: string };
};

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const r = await fetch("/api/accounts");
      return (await r.json()) as AccountsResp;
    },
    refetchInterval: 30000,
  });

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--neutral-800)] bg-[var(--neutral-900)] flex flex-col">
      <nav className="flex flex-col gap-1 py-6 px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
                active
                  ? "bg-[var(--neutral-800)] text-[var(--neutral-50)]"
                  : "text-[var(--neutral-400)] hover:text-[var(--neutral-50)] hover:bg-[var(--neutral-800)]/50",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-6">
        <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)] px-3 mb-2">
          My Accounts
        </div>

        <Link
          href="/connections"
          className="block rounded-md px-3 py-2 hover:bg-[var(--neutral-800)]/50 transition"
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={14} className="text-[var(--info)]" />
            <span className="text-xs font-medium">Telegram</span>
            {data?.telegram.connected ? (
              <Check size={12} className="ml-auto text-[var(--success)]" />
            ) : (
              <span className="ml-auto text-[10px] text-[var(--neutral-500)]">—</span>
            )}
          </div>
          {data?.telegram.connected && (
            <div className="mt-1 ml-6 text-[11px] text-[var(--neutral-400)] truncate">
              {data.telegram.name ?? "Connected"}
              <div className="text-[10px] text-[var(--neutral-500)]">
                {data.telegram.phone}
              </div>
            </div>
          )}
        </Link>

        <Link
          href="/connections"
          className="block rounded-md px-3 py-2 mt-1 hover:bg-[var(--neutral-800)]/50 transition opacity-70"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[var(--neutral-500)]" />
            <span className="text-xs font-medium">Broker</span>
            <span className="ml-auto text-[10px] text-[var(--neutral-500)]">Phase 2</span>
          </div>
          <div className="mt-1 ml-6 text-[11px] text-[var(--neutral-500)] truncate">
            Kite / Upstox / Dhan
          </div>
        </Link>
      </div>
    </aside>
  );
}
