"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MessageCircle,
  Radio,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  XCircle,
} from "lucide-react";
import { cn, pct, practiceRupee, relativeTime, rupee } from "@/lib/utils";

type SlipEvent = {
  stage: string;
  label: string;
  detail: string | null;
  status: "done" | "active" | "failed" | "pending";
  occurredAt: string;
  position: number;
};

type TargetLeg = {
  label: string;
  price: number;
  status: "pending" | "hit" | "missed";
  hitAt: string | null;
};

type TradeSlip = {
  id: string;
  source: "persisted" | "legacy";
  messageId: number;
  tradeId: number | null;
  status: string;
  moneyMode: string;
  symbol: string | null;
  side: string | null;
  instrument: string | null;
  entry: number | null;
  stopLoss: number | null;
  target: number | null;
  targets: TargetLeg[];
  qty: number | null;
  exit: number | null;
  exitReason: string | null;
  pnl: number | null;
  grossPnl: number | null;
  costs: number | null;
  receivedAt: string;
  executedAt: string | null;
  closedAt: string | null;
  latencyMs: number | null;
  message: string;
  confidence: number | null;
  ltp: number | null;
  ltpAt: string | null;
  ticker: string | null;
  events: SlipEvent[];
};

type MessageRow = {
  id: number;
  text: string;
  postedAt: string;
  parsed: boolean;
  slipId: string | null;
};

type TradeSlipsResp = {
  selectedDate: string;
  today: string;
  isToday: boolean;
  channel: { id: number; name: string; username: string | null; mode: string; budget: number };
  status: "live" | "summary";
  modeTag: "paper" | "real";
  latestMessages: MessageRow[];
  activeSlips: TradeSlip[];
  completedSlips: TradeSlip[];
  asOf: string;
};

export function TradeSlipsView({ channelId }: { channelId: string }) {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") ?? todayISTKey();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [expandedSlips, setExpandedSlips] = useState<Set<string>>(() => new Set());

  const { data, isError, isFetching, isLoading, refetch } = useQuery({
    queryKey: ["trade-slips", channelId, selectedDate],
    queryFn: async () => {
      const r = await fetch(`/api/trade-slips/${channelId}?date=${selectedDate}`);
      if (!r.ok) throw new Error("Failed to load trade slips");
      return (await r.json()) as TradeSlipsResp;
    },
    refetchInterval: selectedDate === todayISTKey() ? 5000 : 30000,
  });

  const activeSlips = data?.activeSlips ?? [];
  const completedSlips = data?.completedSlips ?? [];
  const latestMessages = data?.latestMessages ?? [];
  const hasPreExecution = activeSlips.length > 0;
  const toggleSlip = (id: string) => {
    setExpandedSlips((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-[1700px] space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <Link
            href={`/trading-floor?date=${selectedDate}`}
            className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--neutral-500)] hover:text-[var(--neutral-100)]"
          >
            <ArrowLeft size={13} /> Trading Floor
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            <Activity size={13} className="text-[var(--tradex-orange-400)]" />
            <span>{formatShortDate(selectedDate)}</span>
            <StatusPill status={data?.status ?? "summary"} />
            <ModePill mode={data?.modeTag ?? "paper"} />
          </div>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {data?.channel.name ?? "Trade Slips"}
          </h1>
          {data?.channel.username && (
            <div className="mt-1 text-sm text-[var(--neutral-500)]">@{data.channel.username}</div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] px-3 py-2">
            <Clock size={14} className="text-[var(--neutral-500)]" />
            <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">Date</span>
            <input
              type="date"
              value={selectedDate}
              max={data?.today ?? todayISTKey()}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-transparent text-sm font-semibold tabular-nums text-[var(--neutral-100)] outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--neutral-300)] transition hover:border-[var(--tradex-orange-500)]/60 hover:text-[var(--neutral-50)] disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-8 text-sm text-[var(--neutral-500)]">
          Loading trade slips...
        </div>
      )}
      {isError && (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-8 text-sm text-[var(--danger)]">
          Trade slips could not be loaded.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,4fr)_minmax(260px,1fr)]">
          <main className="min-w-0 space-y-5">
            <section className="space-y-3">
              <SectionTitle
                icon={<Radio size={15} />}
                title="Live Execution"
                count={hasPreExecution ? activeSlips.length : 0}
              />
              {hasPreExecution ? (
                activeSlips.map((slip) => (
                  <SlipWithSummary
                    key={slip.id}
                    slip={slip}
                    expanded={expandedSlips.has(slip.id)}
                    onToggle={() => toggleSlip(slip.id)}
                    live
                  />
                ))
              ) : (
                <WaitingSlip />
              )}
            </section>

            <section className="space-y-3">
              <SectionTitle icon={<CheckCircle2 size={15} />} title="Executed Trade Slips" count={completedSlips.length} />
              {completedSlips.length === 0 ? (
                <EmptyState text="No executed slips for this date yet." />
              ) : (
                completedSlips.map((slip) => (
                  <SlipWithSummary
                    key={slip.id}
                    slip={slip}
                    expanded={expandedSlips.has(slip.id)}
                    onToggle={() => toggleSlip(slip.id)}
                  />
                ))
              )}
            </section>
          </main>

          <MessagesRail messages={latestMessages} highlighted={new Set([...activeSlips, ...completedSlips].map((s) => s.messageId))} />
        </div>
      )}
    </div>
  );
}

function SlipWithSummary({
  slip,
  expanded,
  onToggle,
  live,
}: {
  slip: TradeSlip;
  expanded: boolean;
  onToggle: () => void;
  live?: boolean;
}) {
  if (expanded) {
    return (
      <div className="space-y-2">
        <CompactSlipCard slip={slip} expanded onToggle={onToggle} live={live} />
        <TradeSlipCard slip={slip} live={live} />
      </div>
    );
  }
  return <CompactSlipCard slip={slip} expanded={false} onToggle={onToggle} live={live} />;
}

function CompactSlipCard({
  slip,
  expanded,
  onToggle,
  live,
}: {
  slip: TradeSlip;
  expanded: boolean;
  onToggle: () => void;
  live?: boolean;
}) {
  const pnlUp = (slip.pnl ?? 0) >= 0;
  const lastEvent = slip.events[slip.events.length - 1];
  return (
    <article
      className={cn(
        "rounded-xl border bg-[var(--neutral-900)] p-4 transition",
        live ? "border-[var(--tradex-orange-500)]/45" : "border-[var(--neutral-800)]",
        slip.status === "CLOSED" && "border-[var(--success)]/35",
        slip.status === "FAILED" && "border-[var(--danger)]/35",
      )}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(110px,0.5fr))_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-1 text-xs font-semibold",
                slip.side === "SELL"
                  ? "bg-[var(--danger)]/15 text-[var(--danger)]"
                  : "bg-[var(--success)]/15 text-[var(--success)]",
              )}
            >
              {slip.side ?? "WAIT"} {slip.symbol ?? "Signal"}
            </span>
            <SlipStatus status={slip.status} />
          </div>
          <div className="mt-2 truncate text-sm text-[var(--neutral-400)]">{slip.message}</div>
          {lastEvent && (
            <div className="mt-1 text-xs text-[var(--neutral-500)]">
              {lastEvent.label} · {relativeTime(lastEvent.occurredAt)}
            </div>
          )}
        </div>
        <MiniStat label="Received" value={formatTime(slip.receivedAt)} />
        <MiniStat label="Entry" value={slip.entry !== null ? rupee(slip.entry) : "-"} />
        <MiniStat label="LTP / Exit" value={slip.exit !== null ? rupee(slip.exit) : slip.ltp !== null ? rupee(slip.ltp) : "-"} />
        <MiniStat
          label="P&L"
          value={slip.pnl !== null ? practiceRupee(slip.pnl, { sign: true }) : "-"}
          tone={slip.pnl === null ? "neutral" : pnlUp ? "up" : "down"}
        />
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-md border border-[var(--neutral-700)] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--neutral-300)] transition hover:border-[var(--tradex-orange-500)]/70 hover:text-[var(--neutral-50)]"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
    </article>
  );
}

function TradeSlipCard({ slip, live }: { slip: TradeSlip; live?: boolean }) {
  const pnlUp = (slip.pnl ?? 0) >= 0;
  const tracking = slip.status === "TRACKING";
  const closed = slip.status === "CLOSED";
  const failed = slip.status === "FAILED";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-[var(--neutral-900)] transition",
        live && "border-[var(--tradex-orange-500)]/50 shadow-[0_0_0_1px_rgba(249,115,22,0.18)]",
        tracking && "border-[var(--info)]/35",
        closed && "border-[var(--success)]/35",
        failed && "border-[var(--danger)]/35",
      )}
    >
      <div
        className={cn(
          "grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]",
          closed && "bg-[var(--success)]/5",
          failed && "bg-[var(--danger)]/5",
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold",
                slip.side === "SELL"
                  ? "bg-[var(--danger)]/15 text-[var(--danger)]"
                  : "bg-[var(--success)]/15 text-[var(--success)]",
              )}
            >
              {slip.side ?? "WAIT"} {slip.symbol ?? "Signal"}
            </span>
            {slip.instrument && (
              <span className="rounded bg-[var(--neutral-950)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
                {slip.instrument}
              </span>
            )}
            <span className="rounded bg-[var(--tradex-orange-500)]/15 px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--tradex-orange-300)]">
              {slip.moneyMode}
            </span>
            <SlipStatus status={slip.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <MiniStat label="Received" value={formatTime(slip.receivedAt)} />
            <MiniStat label="Executed" value={slip.executedAt ? formatTime(slip.executedAt) : "-"} />
            <MiniStat label={slip.closedAt ? "Closed" : "Live LTP"} value={slip.closedAt ? formatTime(slip.closedAt) : slip.ltp !== null ? rupee(slip.ltp) : "-"} />
            <MiniStat label="Entry" value={slip.entry !== null ? rupee(slip.entry) : "-"} />
            <MiniStat
              label="P&L"
              value={slip.pnl !== null ? practiceRupee(slip.pnl, { sign: true }) : "-"}
              tone={slip.pnl === null ? "neutral" : pnlUp ? "up" : "down"}
            />
          </div>

          <div className="mt-4 rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-950)]/45 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
              <MessageCircle size={12} /> Source Message
            </div>
            <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-[var(--neutral-300)]">{slip.message}</p>
          </div>

          <Targets slip={slip} />
        </div>

        <div className="min-w-0">
          <Timeline events={slip.events} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--neutral-500)]">
            <div className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)]/50 p-2">
              <div className="uppercase tracking-widest">Latency</div>
              <div className="mt-1 font-semibold text-[var(--neutral-200)]">{formatLatency(slip.latencyMs)}</div>
            </div>
            <div className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)]/50 p-2">
              <div className="uppercase tracking-widest">Outcome</div>
              <div className="mt-1 font-semibold text-[var(--neutral-200)]">{slip.exitReason ?? slip.status}</div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Targets({ slip }: { slip: TradeSlip }) {
  const up = slip.side !== "SELL";
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-950)]/45 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
          <Target size={12} /> Target Legs
        </div>
        {slip.targets.length === 0 ? (
          <div className="text-sm text-[var(--neutral-600)]">No target levels detected.</div>
        ) : (
          <div className="space-y-2">
            {slip.targets.map((target) => (
              <div key={`${slip.id}-${target.label}`} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold",
                    target.status === "hit"
                      ? "border-[var(--success)] bg-[var(--success)]/15 text-[var(--success)]"
                      : "border-[var(--neutral-700)] text-[var(--neutral-400)]",
                  )}
                >
                  {target.status === "hit" ? <CheckCircle2 size={12} /> : target.label}
                </span>
                <span className="text-sm tabular-nums">{rupee(target.price)}</span>
                <span className="ml-auto text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
                  {target.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-950)]/45 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} Tracking
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <MiniStat label="LTP" value={slip.ltp !== null ? rupee(slip.ltp) : "-"} />
          <MiniStat label="SL" value={slip.stopLoss !== null ? rupee(slip.stopLoss) : "-"} />
          <MiniStat label="Qty" value={slip.qty !== null ? `${slip.qty}` : "-"} />
          <MiniStat label="Move" value={priceMove(slip)} tone={moveTone(slip)} />
        </div>
      </div>
    </div>
  );
}

function Timeline({ events }: { events: SlipEvent[] }) {
  return (
    <div className="rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-950)]/45 p-3">
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        <ShieldCheck size={12} /> Execution Logic
      </div>
      <div className="space-y-0">
        {events.map((event, index) => (
          <div key={`${event.stage}-${event.position}`} className="grid grid-cols-[24px_1fr] gap-2">
            <div className="flex flex-col items-center">
              <EventIcon status={event.status} />
              {index < events.length - 1 && <span className="h-full min-h-7 w-px bg-[var(--neutral-800)]" />}
            </div>
            <div className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{event.label}</div>
                <div className="text-[10px] tabular-nums text-[var(--neutral-600)]">{formatTime(event.occurredAt)}</div>
              </div>
              {event.detail && <div className="mt-0.5 text-xs text-[var(--neutral-500)]">{event.detail}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesRail({ messages, highlighted }: { messages: MessageRow[]; highlighted: Set<number> }) {
  return (
    <aside className="min-w-0">
      <div className="sticky top-4 space-y-3">
        <SectionTitle icon={<MessageCircle size={15} />} title="Latest Messages" count={messages.length} />
        <div className="max-h-[calc(100vh-190px)] space-y-3 overflow-auto rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-3">
          {messages.length === 0 ? (
            <EmptyState text="No Telegram messages for this date." />
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  highlighted.has(message.id)
                    ? "border-[var(--tradex-orange-500)]/40 bg-[var(--tradex-orange-500)]/10"
                    : "border-[var(--neutral-800)] bg-[var(--neutral-950)]/60",
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
                  <span>{relativeTime(message.postedAt)}</span>
                  {message.parsed && <span className="text-[var(--tradex-orange-300)]">parsed</span>}
                </div>
                <div className="whitespace-pre-wrap break-words text-[var(--neutral-200)]">{message.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

function WaitingSlip() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--neutral-300)]">
            <Loader2 size={16} className="animate-spin text-[var(--tradex-orange-400)]" />
            Waiting for next signal
          </div>
          <p className="mt-1 max-w-xl text-sm text-[var(--neutral-500)]">
            The next Telegram message will activate this slip and start showing parsing, pre-checks, execution, and tracking stages.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-[var(--neutral-600)]">
          <SkeletonBox label="Symbol" />
          <SkeletonBox label="Entry" />
          <SkeletonBox label="Targets" />
        </div>
      </div>
    </div>
  );
}

function SkeletonBox({ label }: { label: string }) {
  return (
    <div className="h-14 min-w-20 rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)]/50 p-2">
      <div className="text-[10px] uppercase tracking-widest">{label}</div>
      <div className="mx-auto mt-2 h-2 w-10 rounded bg-[var(--neutral-800)]" />
    </div>
  );
}

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--neutral-400)]">
        {icon} {title}
      </h2>
      <span className="rounded bg-[var(--neutral-900)] px-2 py-1 text-xs tabular-nums text-[var(--neutral-500)]">{count}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">{label}</div>
      <div
        className={cn(
          "mt-0.5 truncate text-sm font-semibold tabular-nums",
          tone === "up" && "text-[var(--success)]",
          tone === "down" && "text-[var(--danger)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SlipStatus({ status }: { status: string }) {
  const tone = status === "FAILED" ? "down" : status === "CLOSED" || status === "TRACKING" ? "up" : "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-widest",
        tone === "up" && "bg-[var(--success)]/15 text-[var(--success)]",
        tone === "down" && "bg-[var(--danger)]/15 text-[var(--danger)]",
        tone === "neutral" && "bg-[var(--neutral-950)] text-[var(--neutral-400)]",
      )}
    >
      {status === "FAILED" ? <XCircle size={12} /> : status === "TRACKING" ? <Activity size={12} /> : <CheckCircle2 size={12} />}
      {status}
    </span>
  );
}

function EventIcon({ status }: { status: SlipEvent["status"] }) {
  if (status === "active") return <Loader2 size={16} className="animate-spin text-[var(--tradex-orange-400)]" />;
  if (status === "failed") return <XCircle size={16} className="text-[var(--danger)]" />;
  if (status === "done") return <CheckCircle2 size={16} className="text-[var(--success)]" />;
  return <Circle size={16} className="text-[var(--neutral-600)]" />;
}

function StatusPill({ status }: { status: "live" | "summary" }) {
  const live = status === "live";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-2 py-1", live ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--neutral-900)] text-[var(--neutral-400)]")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "animate-ping bg-[var(--success)]" : "bg-[var(--neutral-600)]")} />
      {live ? "Live" : "Summary"}
    </span>
  );
}

function ModePill({ mode }: { mode: "paper" | "real" }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-2 py-1", mode === "paper" ? "bg-[var(--tradex-orange-500)]/15 text-[var(--tradex-orange-300)]" : "bg-[var(--success)]/15 text-[var(--success)]")}>
      <WalletCards size={12} /> {mode === "paper" ? "Paper Trading" : "Real Money"}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6 text-center text-sm text-[var(--neutral-500)]">
      {text}
    </div>
  );
}

function priceMove(slip: TradeSlip): string {
  if (slip.entry === null || slip.ltp === null || slip.entry === 0) return "-";
  const move = slip.side === "SELL" ? slip.entry - slip.ltp : slip.ltp - slip.entry;
  return pct((move / slip.entry) * 100);
}

function moveTone(slip: TradeSlip): "up" | "down" | "neutral" {
  if (slip.entry === null || slip.ltp === null) return "neutral";
  const move = slip.side === "SELL" ? slip.entry - slip.ltp : slip.ltp - slip.entry;
  if (move === 0) return "neutral";
  return move > 0 ? "up" : "down";
}

function formatLatency(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "-";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${`${day}`.padStart(2, "0")}-${`${month}`.padStart(2, "0")}-${year}`;
}

function todayISTKey(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${`${ist.getUTCMonth() + 1}`.padStart(2, "0")}-${`${ist.getUTCDate()}`.padStart(2, "0")}`;
}
