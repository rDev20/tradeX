"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createChart,
  ColorType,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { Star } from "lucide-react";
import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, pct, rupee } from "@/lib/utils";
import { toggleFavorite } from "@/app/(app)/actions";

type Range = "1D" | "1W" | "1M" | "6M" | "1Y";
const RANGES: Range[] = ["1D", "1W", "1M", "6M", "1Y"];

type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type HistoryResp = {
  ticker: string;
  range: Range;
  interval: string;
  previousClose: number | null;
  regularMarketPrice: number | null;
  bars: Bar[];
  error?: string;
};

type Symbol = {
  ticker: string;
  displayName: string;
  exchange: string;
  sector: string;
  ltp: number | null;
  change: number | null;
  favorite: boolean;
};

export function SymbolDetailCard({ symbol }: { symbol: Symbol }) {
  const [range, setRange] = useState<Range>("1D");
  const { data, isFetching } = useQuery({
    queryKey: ["history", symbol.ticker, range],
    queryFn: async () => {
      const r = await fetch(
        `/api/symbol/${encodeURIComponent(symbol.ticker)}/history?range=${range}`,
      );
      return (await r.json()) as HistoryResp;
    },
    refetchInterval: range === "1D" ? 30_000 : false,
    staleTime: range === "1D" ? 20_000 : 5 * 60_000,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  // chart init / teardown
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.55)",
        fontFamily: "var(--font-geist-sans)",
        fontSize: 11,
      },
      width: containerRef.current.clientWidth,
      height: 320,
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
      autoSize: false,
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // update series when data changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data || data.bars.length === 0) return;
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
    }
    const isUp =
      data.bars.length >= 2 && data.bars[data.bars.length - 1].close >= data.bars[0].open;
    const upColor = "rgba(16, 185, 129, 1)";
    const upArea = "rgba(16, 185, 129, 0.18)";
    const downColor = "rgba(239, 68, 68, 1)";
    const downArea = "rgba(239, 68, 68, 0.18)";
    const series = chart.addSeries(AreaSeries, {
      lineColor: isUp ? upColor : downColor,
      topColor: isUp ? upArea : downArea,
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    seriesRef.current = series;
    series.setData(
      data.bars.map((b) => ({ time: b.time as Time, value: b.close })),
    );
    chart.timeScale().fitContent();
  }, [data]);

  const last = data?.bars[data.bars.length - 1]?.close ?? symbol.ltp ?? null;
  const first = data?.bars[0]?.open ?? null;
  const rangeAbs = last !== null && first !== null ? last - first : null;
  const rangePct = rangeAbs !== null && first ? (rangeAbs / first) * 100 : null;
  const high = data?.bars.length ? Math.max(...data.bars.map((b) => b.high)) : null;
  const low = data?.bars.length ? Math.min(...data.bars.map((b) => b.low)) : null;

  const qc = useQueryClient();
  const [pending, startTransition] = useTransition();
  const onToggleFav = () => {
    startTransition(async () => {
      try {
        await toggleFavorite(symbol.ticker);
      } finally {
        qc.invalidateQueries({ queryKey: ["market"] });
      }
    });
  };

  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
              {symbol.exchange} · {symbol.sector}
            </span>
            <span className="text-[10px] text-[var(--neutral-600)] font-mono">
              {symbol.ticker}
            </span>
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{symbol.displayName}</div>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-semibold tabular-nums">
              {last !== null ? rupee(last) : "—"}
            </span>
            {rangeAbs !== null && (
              <span
                className={cn(
                  "text-sm tabular-nums",
                  rangeAbs >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]",
                )}
              >
                {rangeAbs >= 0 ? "+" : ""}
                {rangeAbs.toFixed(2)} ({pct(rangePct)})
                <span className="text-[10px] uppercase tracking-widest opacity-70 ml-1">
                  {range}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFav}
            disabled={pending}
            className={cn(
              "rounded-md p-2 border transition disabled:opacity-50",
              symbol.favorite
                ? "text-[var(--tradex-orange-500)] border-[var(--tradex-orange-500)]/40"
                : "text-[var(--neutral-500)] border-[var(--neutral-800)] hover:text-[var(--tradex-orange-500)] hover:border-[var(--tradex-orange-500)]/40",
            )}
            aria-label={symbol.favorite ? "Unpin" : "Pin"}
          >
            <Star size={14} fill={symbol.favorite ? "currentColor" : "none"} />
          </button>
          <div className="flex items-center gap-1 rounded-md bg-[var(--neutral-800)]/60 p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded transition",
                  range === r
                    ? "bg-[var(--neutral-900)] text-[var(--neutral-50)] shadow"
                    : "text-[var(--neutral-400)] hover:text-[var(--neutral-100)]",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 relative">
        {data?.error ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-[var(--neutral-500)]">
            Failed to load chart: {data.error}
          </div>
        ) : data && data.bars.length === 0 && !isFetching ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-[var(--neutral-500)]">
            No data for this range.
          </div>
        ) : (
          <>
            <div ref={containerRef} className="w-full" style={{ height: 320 }} />
            {isFetching && (
              <div className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
                loading…
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Stat label={`${range} High`} value={high !== null ? rupee(high) : "—"} />
        <Stat label={`${range} Low`} value={low !== null ? rupee(low) : "—"} />
        <Stat
          label="Prev close"
          value={data?.previousClose ? rupee(data.previousClose) : "—"}
        />
        <Stat
          label="Bars"
          value={`${data?.bars.length ?? 0} · ${data?.interval ?? ""}`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--neutral-800)] p-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        {label}
      </div>
      <div className="text-sm font-medium tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
