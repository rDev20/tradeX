"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Radio,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { cn, pct, practiceRupee, relativeTime, rupee } from "@/lib/utils";
import { formatTimeRemaining, marketStatus } from "@/lib/market-hours";

type PortfolioRow = {
  id: number;
  symbol: string;
  side: string;
  instrument: string;
  status: string;
  qty: number;
  entry: number;
  ltp: number | null;
  exit: number | null;
  currentPrice: number | null;
  target: number | null;
  stopLoss: number | null;
  pnl: number | null;
  pctChange: number | null;
  ticker: string | null;
  ltpAt: string | null;
};

type ChannelCard = {
  id: number;
  name: string;
  username: string | null;
  dashboard: {
    messagesReceived: number;
    alertsCaptured: number;
    successfulTradesExecuted: number;
    positiveTrades: number;
    negativeTrades: number;
    openingBalance: number;
    currentValue: number;
    pnl: number;
    realizedGain: number;
    unrealizedPnl: number;
  };
  portfolio: PortfolioRow[];
  cta: {
    live: boolean;
    label: string;
  };
};

type MarketRow = {
  ticker: string;
  displayName: string;
  kind: string;
  exchange: string;
  ltp: number | null;
  change: number | null;
  at: string | null;
};

type TradingFloorResp = {
  selectedDate: string;
  today: string;
  isToday: boolean;
  calendar: {
    month: string;
    days: { date: string; day: number; tradeCount: number; disabled: boolean }[];
  };
  market: {
    status: "open" | "closed";
    lastTickAt: string | null;
    keyTiles: MarketRow[];
    topMovers: MarketRow[];
  };
  channels: ChannelCard[];
};

export function TradingFloorView() {
  const [selectedDate, setSelectedDate] = useState(() => todayISTKey());
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["trading-floor", selectedDate],
    queryFn: async () => {
      const r = await fetch(`/api/trading-floor?date=${selectedDate}`);
      if (!r.ok) throw new Error("Failed to load Trading Floor");
      return (await r.json()) as TradingFloorResp;
    },
    refetchInterval: selectedDate === todayISTKey() ? 5000 : 30000,
  });

  const channels = data?.channels ?? [];
  const today = data?.today ?? todayISTKey();

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            <Activity size={13} className="text-[var(--tradex-orange-500)]" />
            Execution workspace
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Trading Floor</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--neutral-400)]">
            Date-wise channel execution, paper portfolio status, and last available market pulse.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-3 sm:flex-row sm:items-center">
          <TradeCalendarPicker
            calendar={data?.calendar}
            selectedDate={selectedDate}
            today={today}
            onSelect={setSelectedDate}
          />
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--neutral-300)] transition hover:border-[var(--tradex-orange-500)]/60 hover:text-[var(--neutral-50)] disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            Refresh
          </button>
          <MarketCountdown />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,85fr)_minmax(170px,15fr)]">
        <main className="min-w-0 space-y-4">
          {isLoading && (
            <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-8 text-sm text-[var(--neutral-500)]">
              Loading Trading Floor...
            </div>
          )}
          {isError && (
            <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-8 text-sm text-[var(--danger)]">
              Trading Floor could not be loaded.
            </div>
          )}
          {!isLoading && !isError && channels.length === 0 && <EmptyChannels />}
          {channels.map((channel) => (
            <TradingChannelCard key={channel.id} channel={channel} selectedDate={selectedDate} />
          ))}
        </main>

        <MarketRail data={data} />
      </div>
    </div>
  );
}

function TradingChannelCard({ channel, selectedDate }: { channel: ChannelCard; selectedDate: string }) {
  const d = channel.dashboard;
  const pnlUp = d.pnl >= 0;
  const unrealizedUp = d.unrealizedPnl >= 0;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)]">
      <section className="bg-gradient-to-br from-[var(--tradex-orange-900)]/35 via-[var(--neutral-900)] to-[var(--neutral-950)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-[var(--tradex-orange-300)]" />
              <h2 className="truncate text-lg font-semibold">{channel.name}</h2>
              <span className="rounded bg-[var(--neutral-950)]/70 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--neutral-400)]">
                Dashboard
              </span>
            </div>
            {channel.username && (
              <div className="mt-1 text-xs text-[var(--neutral-500)]">@{channel.username}</div>
            )}
          </div>
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-right tabular-nums",
              pnlUp
                ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
                : "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]",
            )}
          >
            <div className="text-[10px] uppercase tracking-widest opacity-80">P/L</div>
            <div className="text-lg font-semibold">{practiceRupee(d.pnl, { sign: true })}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric icon={<Clock size={14} />} label="Messages received" value={`${d.messagesReceived}`} />
          <Metric icon={<Bell size={14} />} label="Alerts captured" value={`${d.alertsCaptured}`} />
          <Metric
            icon={<CheckCircle2 size={14} />}
            label="Successful trades"
            value={`${d.successfulTradesExecuted}`}
          />
          <Metric
            icon={<Scale size={14} />}
            label="+ve / -ve ratio"
            value={`${d.positiveTrades} / ${d.negativeTrades}`}
            tone={d.positiveTrades >= d.negativeTrades ? "up" : "down"}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Metric icon={<WalletCards size={14} />} label="Opening balance" value={practiceRupee(d.openingBalance)} />
          <Metric icon={<Activity size={14} />} label="Current value" value={practiceRupee(d.currentValue)} />
          <Metric
            icon={pnlUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            label="Net P/L"
            value={practiceRupee(d.pnl, { sign: true })}
            tone={d.pnl === 0 ? "neutral" : pnlUp ? "up" : "down"}
          />
          <Metric
            icon={unrealizedUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            label="Unrealized P/L"
            value={practiceRupee(d.unrealizedPnl, { sign: true })}
            tone={d.unrealizedPnl === 0 ? "neutral" : unrealizedUp ? "up" : "down"}
          />
        </div>
      </section>

      <section className="border-t border-[var(--neutral-800)] bg-[var(--neutral-900)]/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-wide text-[var(--neutral-300)]">
            Portfolio - {channel.name}
          </h3>
          <span className="text-xs tabular-nums text-[var(--neutral-500)]">
            {channel.portfolio.length} position{channel.portfolio.length === 1 ? "" : "s"}
          </span>
        </div>

        {channel.portfolio.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-[var(--neutral-800)] px-4 py-6 text-center text-sm text-[var(--neutral-500)]">
            No trades executed for this date.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[var(--neutral-800)] overflow-hidden rounded-lg border border-[var(--neutral-800)]">
            {channel.portfolio.map((row) => (
              <PortfolioLine key={row.id} row={row} />
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Link
            href={`/trading-floor?date=${selectedDate}`}
            className={cn(
              "inline-flex w-auto items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold tracking-wide transition",
              channel.cta.live
                ? "bg-[var(--tradex-orange-500)] text-white hover:bg-[var(--tradex-orange-600)]"
                : "bg-[var(--tradex-orange-500)]/85 text-white hover:bg-[var(--tradex-orange-500)]",
            )}
          >
            {channel.cta.live ? (
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute h-3 w-3 animate-ping rounded-full bg-white/70" />
                <span className="relative h-2 w-2 rounded-full bg-white" />
              </span>
            ) : (
              <ClipboardList size={14} />
            )}
            {channel.cta.live ? "WATCH LIVE" : channel.cta.label}
          </Link>
        </div>
      </section>
    </article>
  );
}

function TradeCalendarPicker({
  calendar,
  selectedDate,
  today,
  onSelect,
}: {
  calendar: TradingFloorResp["calendar"] | undefined;
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const visibleMonth = calendar?.month ?? selectedDate.slice(0, 7);
  const days = calendar?.days ?? [];
  const firstWeekday = firstDayOffset(visibleMonth);
  const monthLabel = formatMonth(visibleMonth);

  const moveMonth = (delta: number) => {
    const next = monthOffset(visibleMonth, delta);
    const candidate = clampDateToMonth(selectedDate, next, today);
    onSelect(candidate);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-w-48 items-center gap-2 rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] px-3 py-2 text-left"
      >
        <CalendarDays size={15} className="text-[var(--neutral-500)]" />
        <span className="text-xs uppercase tracking-widest text-[var(--neutral-500)]">Date</span>
        <span className="ml-auto text-sm font-semibold tabular-nums text-[var(--neutral-100)]">
          {formatShortDate(selectedDate)}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-md border border-[var(--neutral-800)] p-1.5 text-[var(--neutral-400)] hover:text-[var(--neutral-50)]"
              aria-label="Previous month"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="text-sm font-semibold">{monthLabel}</div>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              disabled={visibleMonth >= today.slice(0, 7)}
              className="rounded-md border border-[var(--neutral-800)] p-1.5 text-[var(--neutral-400)] hover:text-[var(--neutral-50)] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-[var(--neutral-600)]">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <div key={`${day}-${index}`} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div key={`blank-${index}`} />
            ))}
            {days.map((day) => {
              const selected = day.date === selectedDate;
              const hasTrades = day.tradeCount > 0;
              const noTrade = !day.disabled && !hasTrades;
              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={day.disabled}
                  onClick={() => {
                    onSelect(day.date);
                    setOpen(false);
                  }}
                  title={hasTrades ? `${day.tradeCount} trade${day.tradeCount === 1 ? "" : "s"}` : "No trades"}
                  className={cn(
                    "relative flex h-8 items-center justify-center rounded-md border text-xs tabular-nums transition",
                    selected
                      ? "border-[var(--tradex-orange-500)] bg-[var(--tradex-orange-500)] text-white"
                      : hasTrades
                        ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--neutral-50)] hover:border-[var(--success)]"
                        : "border-transparent bg-[var(--neutral-950)]/60 text-[var(--neutral-400)] hover:border-[var(--neutral-700)]",
                    day.disabled && "cursor-not-allowed opacity-25 hover:border-transparent",
                  )}
                >
                  {noTrade && (
                    <span className="pointer-events-none absolute h-px w-6 rotate-[-35deg] bg-[var(--neutral-600)]" />
                  )}
                  <span className="relative">{day.day}</span>
                  {hasTrades && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--success)]" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--neutral-500)]">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> trade day
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-px w-4 rotate-[-35deg] bg-[var(--neutral-600)]" /> no trades
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-950)]/55 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        <span className={tone === "up" ? "text-[var(--success)]" : tone === "down" ? "text-[var(--danger)]" : ""}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "mt-1 truncate text-base font-semibold tabular-nums",
          tone === "up" && "text-[var(--success)]",
          tone === "down" && "text-[var(--danger)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PortfolioLine({ row }: { row: PortfolioRow }) {
  const up = (row.pnl ?? 0) >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 bg-[var(--neutral-950)]/35 px-3 py-3 text-sm md:grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr_0.8fr_1fr] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{row.symbol}</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
              row.side === "BUY"
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : "bg-[var(--danger)]/15 text-[var(--danger)]",
            )}
          >
            {row.side}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[10px] text-[var(--neutral-500)]">
          {row.instrument} {row.ticker ? `- ${row.ticker}` : ""}
        </div>
      </div>
      <SmallStat label="Status" value={row.status} />
      <SmallStat label="Qty" value={`${row.qty}`} />
      <SmallStat label="Entry" value={rupee(row.entry)} />
      <SmallStat
        label={row.status === "OPEN" ? "LTP" : "Exit"}
        value={row.currentPrice !== null ? rupee(row.currentPrice) : "N/A"}
        extra={row.ltpAt ? relativeTime(row.ltpAt) : undefined}
      />
      <div className="text-left md:text-right">
        <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">P&L / Growth</div>
        <div
          className={cn(
            "mt-0.5 font-semibold tabular-nums",
            row.pnl === null ? "text-[var(--neutral-500)]" : up ? "text-[var(--success)]" : "text-[var(--danger)]",
          )}
        >
          {row.pnl !== null ? practiceRupee(row.pnl, { sign: true }) : "N/A"}
        </div>
        <div
          className={cn(
            "text-[10px] tabular-nums",
            row.pctChange === null ? "text-[var(--neutral-600)]" : up ? "text-[var(--success)]" : "text-[var(--danger)]",
          )}
        >
          {pct(row.pctChange)}
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">{label}</div>
      <div className="mt-0.5 truncate tabular-nums text-[var(--neutral-100)]">{value}</div>
      {extra && <div className="truncate text-[9px] text-[var(--neutral-600)]">{extra}</div>}
    </div>
  );
}

function MarketRail({ data }: { data: TradingFloorResp | undefined }) {
  const keyTiles = data?.market.keyTiles ?? [];
  const topMovers = data?.market.topMovers ?? [];

  return (
    <aside className="min-w-0 space-y-4">
      <section>
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--neutral-500)]">
          Market Pulse
        </div>
        <div className="space-y-2">
          {keyTiles.length === 0 ? (
            <RailEmpty />
          ) : (
            keyTiles.map((row) => <MarketTile key={row.ticker} row={row} />)
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--neutral-500)]">
          Top Moves
        </div>
        <div className="space-y-2">
          {topMovers.length === 0 ? (
            <RailEmpty />
          ) : (
            topMovers.map((row) => <MarketTile key={row.ticker} row={row} compact />)
          )}
        </div>
      </section>

      {data?.market.lastTickAt && (
        <div className="text-[10px] text-[var(--neutral-600)]">
          Last tick {relativeTime(data.market.lastTickAt)}
        </div>
      )}
    </aside>
  );
}

function MarketTile({ row, compact }: { row: MarketRow; compact?: boolean }) {
  const up = (row.change ?? 0) >= 0;
  return (
    <Link
      href={`/market?focus=${encodeURIComponent(row.ticker)}`}
      className="block rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-3 transition hover:border-[var(--tradex-orange-500)]/60 hover:bg-[var(--neutral-800)]/50"
    >
      <div className="truncate text-xs font-semibold">{row.displayName}</div>
      <div className="mt-0.5 truncate text-[9px] uppercase tracking-widest text-[var(--neutral-600)]">
        {row.exchange} - {row.ticker}
      </div>
      <div className={cn("mt-2 font-semibold tabular-nums", compact ? "text-base" : "text-lg")}>
        {row.ltp !== null ? rupee(row.ltp) : "N/A"}
      </div>
      <div
        className={cn(
          "mt-0.5 flex items-center gap-1 text-xs tabular-nums",
          up ? "text-[var(--success)]" : "text-[var(--danger)]",
        )}
      >
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {pct(row.change)}
      </div>
    </Link>
  );
}

function RailEmpty() {
  return (
    <div className="rounded-lg border border-dashed border-[var(--neutral-800)] p-3 text-xs text-[var(--neutral-500)]">
      Waiting for market ticks.
    </div>
  );
}

function MarketCountdown() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const status = useMemo(() => marketStatus(now), [now]);
  const open = status.state === "open";
  const target = open ? status.closesAt : status.nextOpen;

  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] px-3 py-2">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          open ? "bg-[var(--success)] shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" : "bg-[var(--neutral-600)]",
        )}
      />
      <div>
        <div className="text-xs font-semibold">
          Market {open ? "closes" : "opens"} in {formatTimeRemaining(target, now)}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
          NSE 09:15-15:30 IST
        </div>
      </div>
    </div>
  );
}

function EmptyChannels() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--neutral-800)] bg-[var(--neutral-900)] p-10 text-center">
      <Radio className="mx-auto text-[var(--neutral-600)]" size={30} />
      <div className="mt-3 font-medium">No live source channels yet</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--neutral-500)]">
        The admin source is not reading any Telegram channels yet. Once channels are selected,
        their signal dashboards will appear here.
      </p>
    </div>
  );
}

function todayISTKey(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const year = ist.getUTCFullYear();
  const month = `${ist.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${ist.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstDayOffset(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  const day = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function monthOffset(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}`;
}

function clampDateToMonth(currentDate: string, monthKey: string, today: string): string {
  const currentDay = Number(currentDate.slice(8, 10));
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(currentDay, daysInMonth);
  const candidate = `${monthKey}-${`${day}`.padStart(2, "0")}`;
  if (candidate > today) return today;
  return candidate;
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${`${day}`.padStart(2, "0")}-${`${month}`.padStart(2, "0")}-${year}`;
}
