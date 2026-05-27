"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition, useMemo } from "react";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { cn, pct, rupee, relativeTime } from "@/lib/utils";
import { toggleFavorite } from "@/app/(app)/actions";
import { MarketStatusBar, NotTradingPill } from "./market-status";
import { SECTORS, type Sector } from "@/lib/symbols";

type Row = {
  ticker: string;
  displayName: string;
  kind: "INDEX" | "EQUITY" | "CURRENCY";
  exchange: "NSE" | "BSE" | "FX";
  sector: Sector;
  ltp: number | null;
  change: number | null;
  at: string | null;
  favorite: boolean;
  sparkline: number[];
};

type MarketResp = {
  symbols: Row[];
  lastTickAt: string | null;
};

export function MarketGrid() {
  const { data } = useQuery({
    queryKey: ["market"],
    queryFn: async () => {
      const r = await fetch("/api/market");
      return (await r.json()) as MarketResp;
    },
    refetchInterval: 5000,
  });

  const rows = data?.symbols ?? [];
  const lastTickAt = data?.lastTickAt ?? null;
  const [activeChip, setActiveChip] = useState<"All" | "Favorites" | Sector>("All");

  const sectorCounts = useMemo(() => {
    const m = new Map<Sector, number>();
    for (const r of rows) m.set(r.sector, (m.get(r.sector) ?? 0) + 1);
    return m;
  }, [rows]);

  const filtered = useMemo(() => {
    if (activeChip === "All") return rows;
    if (activeChip === "Favorites") return rows.filter((r) => r.favorite);
    return rows.filter((r) => r.sector === activeChip);
  }, [rows, activeChip]);

  const favorites = rows.filter((r) => r.favorite);

  return (
    <div className="space-y-6">
      <MarketStatusBar lastTickAt={lastTickAt} />

      <TopMovers rows={rows} />

      <SectorChips
        sectorCounts={sectorCounts}
        active={activeChip}
        onChange={setActiveChip}
        favoritesCount={favorites.length}
        totalCount={rows.length}
      />

      {activeChip === "All" && favorites.length > 0 && (
        <section>
          <SectionHeader title="Favorites" count={favorites.length} />
          <Grid rows={favorites} />
        </section>
      )}

      <section>
        <SectionHeader
          title={
            activeChip === "All"
              ? "All symbols"
              : activeChip === "Favorites"
                ? "Favorites"
                : activeChip
          }
          count={filtered.length}
        />
        {filtered.length === 0 ? (
          <div className="text-sm text-[var(--neutral-500)] bg-[var(--neutral-900)] border border-[var(--neutral-800)] rounded-lg p-6 text-center">
            No symbols in this category yet.
          </div>
        ) : (
          <Grid rows={filtered} />
        )}
      </section>
    </div>
  );
}

function SectorChips({
  sectorCounts,
  active,
  onChange,
  favoritesCount,
  totalCount,
}: {
  sectorCounts: Map<Sector, number>;
  active: "All" | "Favorites" | Sector;
  onChange: (s: "All" | "Favorites" | Sector) => void;
  favoritesCount: number;
  totalCount: number;
}) {
  const chips: { key: "All" | "Favorites" | Sector; label: string; count: number }[] = [
    { key: "All", label: "All", count: totalCount },
    { key: "Favorites", label: "★ Favorites", count: favoritesCount },
    ...SECTORS.map((s) => ({
      key: s,
      label: s,
      count: sectorCounts.get(s) ?? 0,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => {
        const isActive = active === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5",
              isActive
                ? "bg-[var(--tradex-orange-500)] border-[var(--tradex-orange-500)] text-white"
                : "bg-[var(--neutral-900)] border-[var(--neutral-800)] text-[var(--neutral-300)] hover:border-[var(--neutral-700)] hover:bg-[var(--neutral-800)]/50",
            )}
          >
            <span>{c.label}</span>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                isActive ? "opacity-80" : "text-[var(--neutral-500)]",
              )}
            >
              {c.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TopMovers({ rows }: { rows: Row[] }) {
  const withChange = rows.filter((r) => r.change !== null);
  const sorted = withChange.slice().sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
  const gainers = sorted.slice(0, 3);
  const losers = sorted.slice(-3).reverse();

  if (withChange.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4 text-xs text-[var(--neutral-500)] text-center">
        Top movers appear once the Trading Service starts polling prices.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MoverList title="Top Gainers" rows={gainers} icon={<TrendingUp size={14} />} up />
      <MoverList title="Top Losers" rows={losers} icon={<TrendingDown size={14} />} />
    </div>
  );
}

function MoverList({
  title,
  rows,
  icon,
  up,
}: {
  title: string;
  rows: Row[];
  icon: React.ReactNode;
  up?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(up ? "text-[var(--success)]" : "text-[var(--danger)]")}>{icon}</span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
          {title}
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.ticker} className="flex items-center gap-3">
            <span className="text-xs font-medium truncate flex-1">{r.displayName}</span>
            <span className="text-xs tabular-nums text-[var(--neutral-400)]">
              {r.ltp !== null ? rupee(r.ltp) : "—"}
            </span>
            <span
              className={cn(
                "text-xs tabular-nums w-16 text-right",
                (r.change ?? 0) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]",
              )}
            >
              {pct(r.change)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)]">
        {title}
      </h2>
      <span className="text-xs text-[var(--neutral-500)]">{count}</span>
    </div>
  );
}

function Grid({ rows }: { rows: Row[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {rows.map((r) => (
        <SymbolCard key={r.ticker} row={r} />
      ))}
    </div>
  );
}

function SymbolCard({ row }: { row: Row }) {
  const [pending, startTransition] = useTransition();
  const qc = useQueryClient();
  const up = (row.change ?? 0) >= 0;

  const onToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      qc.setQueryData<MarketResp>(["market"], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          symbols: prev.symbols.map((s) =>
            s.ticker === row.ticker ? { ...s, favorite: !s.favorite } : s,
          ),
        };
      });
      try {
        await toggleFavorite(row.ticker);
      } finally {
        qc.invalidateQueries({ queryKey: ["market"] });
      }
    });
  };

  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4 hover:border-[var(--neutral-700)] transition group relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={cn(
          "absolute top-3 right-3 transition disabled:opacity-50 z-10",
          row.favorite
            ? "text-[var(--tradex-orange-500)]"
            : "text-[var(--neutral-600)] hover:text-[var(--tradex-orange-500)]",
        )}
        aria-label={row.favorite ? "Unpin favorite" : "Pin favorite"}
      >
        <Star size={18} fill={row.favorite ? "currentColor" : "none"} />
      </button>
      <div className="pr-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            {row.exchange} · {row.sector}
          </span>
          <NotTradingPill />
        </div>
        <div className="font-semibold mt-1 truncate">{row.displayName}</div>
        <div className="text-[10px] text-[var(--neutral-600)] truncate">{row.ticker}</div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-2xl font-semibold tabular-nums">
            {row.ltp !== null ? rupee(row.ltp) : "—"}
          </div>
          <div
            className={cn(
              "text-xs tabular-nums mt-1",
              up ? "text-[var(--success)]" : "text-[var(--danger)]",
            )}
          >
            {pct(row.change)}
          </div>
          {row.at && (
            <div className="text-[10px] text-[var(--neutral-600)] mt-1">
              {relativeTime(row.at)}
            </div>
          )}
        </div>
        <Sparkline points={row.sparkline} up={up} />
      </div>
    </div>
  );
}

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) {
    return <div className="w-20 h-8" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <path
        d={d}
        stroke={up ? "var(--success)" : "var(--danger)"}
        strokeWidth={1.5}
        fill="none"
      />
    </svg>
  );
}
