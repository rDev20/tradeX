"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, ChevronDown } from "lucide-react";
import { cn, pct, rupee } from "@/lib/utils";
import { SymbolDetailCard } from "./symbol-detail-card";

type Row = {
  ticker: string;
  displayName: string;
  kind: "INDEX" | "EQUITY" | "CURRENCY";
  exchange: "NSE" | "BSE" | "FX";
  sector: string;
  ltp: number | null;
  change: number | null;
  at: string | null;
  favorite: boolean;
};

type MarketResp = {
  symbols: Row[];
};

export function FeaturedSymbol({ focusTicker }: { focusTicker?: string | null }) {
  const { data } = useQuery({
    queryKey: ["market"],
    queryFn: async () => {
      const r = await fetch("/api/market");
      return (await r.json()) as MarketResp;
    },
    refetchInterval: 5000,
  });

  const all = data?.symbols ?? [];
  const favorites = all.filter((r) => r.favorite);
  const candidates = favorites.length > 0 ? favorites : all.slice(0, 1);
  const [activeTicker, setActiveTicker] = useState<string | null>(null);

  // sync focused/default selection when data changes
  useEffect(() => {
    if (focusTicker && all.some((c) => c.ticker === focusTicker)) {
      setActiveTicker(focusTicker);
      return;
    }
    if (candidates.length === 0) return;
    if (activeTicker && candidates.some((c) => c.ticker === activeTicker)) return;
    setActiveTicker(candidates[0].ticker);
  }, [all, candidates, activeTicker, focusTicker]);

  const active = useMemo(
    () => all.find((r) => r.ticker === activeTicker) ?? candidates[0] ?? null,
    [all, activeTicker, candidates],
  );

  if (!active) {
    return (
      <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6 text-sm text-[var(--neutral-500)] text-center">
        Pin a stock to ★ Favorites to see its detailed chart here.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] flex items-center gap-2">
          <Star size={14} className="text-[var(--tradex-orange-500)]" fill="currentColor" />
          Featured · {favorites.length > 0 ? "Your favorites" : "Default"}
        </h2>
        <span className="text-xs text-[var(--neutral-500)]">
          {favorites.length} pinned · click a card below to switch
        </span>
      </div>

      <SymbolDetailCard
        symbol={{
          ticker: active.ticker,
          displayName: active.displayName,
          exchange: active.exchange,
          sector: active.sector,
          ltp: active.ltp,
          change: active.change,
          favorite: active.favorite,
        }}
      />

      {candidates.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {candidates.map((c) => {
            const up = (c.change ?? 0) >= 0;
            const isActive = c.ticker === activeTicker;
            return (
              <button
                key={c.ticker}
                type="button"
                onClick={() => setActiveTicker(c.ticker)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition flex items-center gap-3",
                  isActive
                    ? "border-[var(--tradex-orange-500)] bg-[var(--tradex-orange-500)]/10"
                    : "border-[var(--neutral-800)] bg-[var(--neutral-900)] hover:border-[var(--neutral-700)]",
                )}
              >
                <div>
                  <div className="text-xs font-medium truncate max-w-[180px]">
                    {c.displayName}
                  </div>
                  <div className="text-[10px] text-[var(--neutral-500)]">{c.exchange}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs tabular-nums">
                    {c.ltp !== null ? rupee(c.ltp) : "—"}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] tabular-nums",
                      up ? "text-[var(--success)]" : "text-[var(--danger)]",
                    )}
                  >
                    {pct(c.change)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
