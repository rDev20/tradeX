"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Lock, Clock,
  Briefcase, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { cn, practiceRupee, pct, relativeTime } from "@/lib/utils";

type OpenPosition = {
  id: number;
  symbol: string;
  displayName: string;
  ticker: string | null;
  side: "BUY" | "SELL";
  instrument: string;
  qty: number;
  entry: number;
  ltp: number | null;
  ltpAt: string | null;
  target: number | null;
  stopLoss: number | null;
  investedValue: number;
  currentValue: number | null;
  unrealized: number | null;
  pctChange: number | null;
  openedAt: string;
  timeInTrade: number;
  channel: { id: number; name: string; username: string | null };
};

type ClosedPosition = {
  id: number;
  symbol: string;
  side: "BUY" | "SELL";
  instrument: string;
  qty: number;
  entry: number;
  exit: number | null;
  exitReason: string | null;
  grossPnl: number | null;
  netPnl: number | null;
  costs: number | null;
  costsBreakdown: { brokerage: number; stt: number; exchange: number; sebi: number; stamp: number; gst: number; total: number } | null;
  openedAt: string;
  closedAt: string | null;
  channel: { id: number; name: string; username: string | null };
};

type PortfolioResp = {
  aggregates: {
    openCount: number;
    invested: number;
    currentValue: number;
    unrealizedPnl: number;
    realizedToday: number;
    totalRealized: number;
    totalCosts: number;
  };
  open: OpenPosition[];
  closed: ClosedPosition[];
  asOf: string;
};

export function PortfolioView() {
  const [tab, setTab] = useState<"paper" | "live">("paper");
  const { data } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const r = await fetch("/api/portfolio");
      return (await r.json()) as PortfolioResp;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-5">
      {/* Mode banner — strong visual reinforcement */}
      <div className="paper-stripes border border-[var(--tradex-orange-700)]/40 rounded-xl px-4 py-2 text-center">
        <div className="text-xs font-semibold tracking-widest uppercase text-[var(--tradex-orange-100)]">
          Paper Trading Holdings · Practice ₹ Only · No Real Positions
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--neutral-800)]">
        <TabButton
          active={tab === "paper"}
          onClick={() => setTab("paper")}
          icon={<Briefcase size={14} />}
          label="Paper"
          count={data?.aggregates.openCount ?? 0}
        />
        <TabButton
          active={tab === "live"}
          onClick={() => setTab("live")}
          icon={<Lock size={14} />}
          label="Live"
          disabled
          subtitle="Phase 4"
        />
      </div>

      {tab === "live" ? <LiveLockedState /> : <PaperPanel data={data} />}
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, count, subtitle, disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  subtitle?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 -mb-[2px] transition",
        active
          ? "border-[var(--tradex-orange-500)] text-[var(--neutral-50)]"
          : disabled
            ? "border-transparent text-[var(--neutral-600)] cursor-not-allowed"
            : "border-transparent text-[var(--neutral-400)] hover:text-[var(--neutral-100)]",
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-[var(--neutral-800)] text-[var(--neutral-400)]">
          {count}
        </span>
      )}
      {subtitle && (
        <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-600)] ml-1">
          {subtitle}
        </span>
      )}
    </button>
  );
}

function LiveLockedState() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--neutral-800)] bg-[var(--neutral-900)]/50 p-12 text-center">
      <Lock className="mx-auto mb-3 text-[var(--neutral-600)]" size={32} />
      <div className="font-medium">Live trading is coming in Phase 4</div>
      <p className="text-sm text-[var(--neutral-500)] mt-2 max-w-md mx-auto leading-relaxed">
        Connect a broker (Kite, Upstox, Dhan) to graduate evaluated channels into real money. Until
        then, every trade in tradeX is paper-only.
      </p>
    </div>
  );
}

function PaperPanel({ data }: { data: PortfolioResp | undefined }) {
  if (!data) {
    return <div className="text-sm text-[var(--neutral-500)] p-6">Loading…</div>;
  }
  const a = data.aggregates;
  const upInvest = a.unrealizedPnl >= 0;
  const upRealized = a.totalRealized >= 0;
  const upToday = a.realizedToday >= 0;

  return (
    <div className="space-y-6">
      {/* Aggregate header */}
      <div className="rounded-xl border border-[var(--neutral-800)] bg-gradient-to-br from-[var(--neutral-900)] to-[var(--neutral-950)] p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <Metric label="Invested" value={practiceRupee(a.invested)} />
          <Metric
            label="Current value"
            value={practiceRupee(a.currentValue)}
          />
          <Metric
            label="Unrealized P&L"
            value={practiceRupee(a.unrealizedPnl, { sign: true })}
            tone={a.unrealizedPnl === 0 ? "neutral" : upInvest ? "up" : "down"}
            extraIcon={upInvest ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          />
          <Metric
            label="Today's realized"
            value={practiceRupee(a.realizedToday, { sign: true })}
            tone={a.realizedToday === 0 ? "neutral" : upToday ? "up" : "down"}
          />
          <Metric
            label="Lifetime realized"
            value={practiceRupee(a.totalRealized, { sign: true })}
            tone={a.totalRealized === 0 ? "neutral" : upRealized ? "up" : "down"}
            extra={`net of ${practiceRupee(a.totalCosts)} costs`}
          />
        </div>
      </div>

      {/* Open positions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)]">
            Open positions
          </h2>
          <span className="text-xs text-[var(--neutral-500)]">{data.open.length}</span>
        </div>
        {data.open.length === 0 ? (
          <EmptyState
            title="No open positions"
            body="Once the AI engine paper-trades a signal, the active position appears here with live LTP and unrealized P&L."
          />
        ) : (
          <OpenTable rows={data.open} />
        )}
      </section>

      {/* Closed positions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)]">
            Closed positions
          </h2>
          <span className="text-xs text-[var(--neutral-500)]">{data.closed.length}</span>
        </div>
        {data.closed.length === 0 ? (
          <EmptyState title="No closed trades yet" body="Trades that hit target, SL, or EOD will appear here." />
        ) : (
          <ClosedTable rows={data.closed} />
        )}
      </section>
    </div>
  );
}

function Metric({
  label, value, tone, extra, extraIcon,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
  extra?: string;
  extraIcon?: React.ReactNode;
}) {
  const colour =
    tone === "up"
      ? "text-[var(--success)]"
      : tone === "down"
        ? "text-[var(--danger)]"
        : "text-[var(--neutral-100)]";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">{label}</div>
      <div className={cn("text-xl md:text-2xl font-semibold tabular-nums mt-1 flex items-center gap-1", colour)}>
        {value}
        {tone && tone !== "neutral" && extraIcon}
      </div>
      {extra && <div className="text-[10px] text-[var(--neutral-500)] mt-1">{extra}</div>}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-8 text-center">
      <div className="font-medium">{title}</div>
      <p className="text-sm text-[var(--neutral-500)] mt-1 max-w-md mx-auto">{body}</p>
    </div>
  );
}

function OpenTable({ rows }: { rows: OpenPosition[] }) {
  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[var(--neutral-800)]/50 text-[var(--neutral-400)]">
          <tr>
            <Th>Symbol</Th>
            <Th>Side</Th>
            <Th>Channel</Th>
            <Th right>Qty</Th>
            <Th right>Entry</Th>
            <Th right>LTP</Th>
            <Th right>Cur. value</Th>
            <Th right>Unrealized P&L</Th>
            <Th right>Day Δ</Th>
            <Th right>Target / SL</Th>
            <Th right>Time in trade</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--neutral-800)]">
          {rows.map((r) => {
            const up = (r.unrealized ?? 0) >= 0;
            return (
              <tr key={r.id}>
                <Td>
                  <div className="flex flex-col">
                    <span className="font-medium">{r.displayName}</span>
                    <span className="text-[10px] text-[var(--neutral-500)]">{r.symbol} · {r.instrument}</span>
                  </div>
                </Td>
                <Td>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded font-semibold",
                      r.side === "BUY"
                        ? "bg-[var(--success)]/15 text-[var(--success)]"
                        : "bg-[var(--danger)]/15 text-[var(--danger)]",
                    )}
                  >
                    {r.side}
                  </span>
                  <span className="text-[10px] uppercase ml-1.5 bg-[var(--tradex-orange-500)]/15 text-[var(--tradex-orange-300)] px-1.5 rounded">
                    Paper
                  </span>
                </Td>
                <Td>
                  <Link href={`/scorecard/${r.channel.id}`} className="text-xs text-[var(--tradex-orange-300)] hover:underline">
                    {r.channel.name}
                  </Link>
                </Td>
                <Td right mono>{r.qty}</Td>
                <Td right mono>{practiceRupee(r.entry)}</Td>
                <Td right mono>
                  {r.ltp !== null ? (
                    <div className="flex flex-col items-end">
                      <span>{practiceRupee(r.ltp)}</span>
                      {r.ltpAt && (
                        <span className="text-[9px] text-[var(--neutral-600)]">
                          as of {new Date(r.ltpAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[var(--neutral-600)]">—</span>
                  )}
                </Td>
                <Td right mono>
                  {r.currentValue !== null ? practiceRupee(r.currentValue) : <span className="text-[var(--neutral-600)]">—</span>}
                </Td>
                <Td right mono className={r.unrealized === null ? "" : up ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                  {r.unrealized !== null ? practiceRupee(r.unrealized, { sign: true }) : <span className="text-[var(--neutral-600)]">—</span>}
                </Td>
                <Td right mono className={r.pctChange === null ? "" : up ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                  {pct(r.pctChange)}
                </Td>
                <Td right mono>
                  <div className="text-[10px]">
                    <div>T: {r.target ? `₹${r.target}` : "—"}</div>
                    <div>SL: {r.stopLoss ? `₹${r.stopLoss}` : "—"}</div>
                  </div>
                </Td>
                <Td right>
                  <span className="text-[10px] text-[var(--neutral-500)] inline-flex items-center gap-1">
                    <Clock size={10} /> {relativeTime(r.openedAt)}
                  </span>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClosedTable({ rows }: { rows: ClosedPosition[] }) {
  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[var(--neutral-800)]/50 text-[var(--neutral-400)]">
          <tr>
            <Th>Closed</Th>
            <Th>Symbol</Th>
            <Th>Side</Th>
            <Th>Channel</Th>
            <Th right>Qty</Th>
            <Th right>Entry</Th>
            <Th right>Exit</Th>
            <Th>Outcome</Th>
            <Th right>Gross P&L</Th>
            <Th right>Costs</Th>
            <Th right>Net P&L</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--neutral-800)]">
          {rows.map((r) => {
            const up = (r.netPnl ?? 0) >= 0;
            const cb = r.costsBreakdown;
            return (
              <tr key={r.id}>
                <Td muted>{r.closedAt ? relativeTime(r.closedAt) : "—"}</Td>
                <Td>
                  <span className="font-medium">{r.symbol}</span>
                  <span className="text-[10px] text-[var(--neutral-500)] ml-1">{r.instrument}</span>
                </Td>
                <Td>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded font-semibold",
                      r.side === "BUY"
                        ? "bg-[var(--success)]/15 text-[var(--success)]"
                        : "bg-[var(--danger)]/15 text-[var(--danger)]",
                    )}
                  >
                    {r.side}
                  </span>
                </Td>
                <Td>
                  <Link href={`/scorecard/${r.channel.id}`} className="text-xs text-[var(--tradex-orange-300)] hover:underline">
                    {r.channel.name}
                  </Link>
                </Td>
                <Td right mono>{r.qty}</Td>
                <Td right mono>₹{r.entry}</Td>
                <Td right mono>{r.exit ? `₹${r.exit}` : "—"}</Td>
                <Td>
                  <span className="text-xs uppercase tracking-wider text-[var(--neutral-400)]">
                    {r.exitReason ?? "—"}
                  </span>
                </Td>
                <Td right mono>
                  {r.grossPnl !== null ? practiceRupee(r.grossPnl, { sign: true }) : "—"}
                </Td>
                <Td right mono className="relative group">
                  {r.costs !== null ? (
                    <span className="text-[var(--danger)] cursor-help" title={cb ? `Brokerage ₹${cb.brokerage}\nSTT ₹${cb.stt}\nExchange ₹${cb.exchange}\nSEBI ₹${cb.sebi}\nStamp ₹${cb.stamp}\nGST ₹${cb.gst}` : ""}>
                      −{practiceRupee(r.costs)}
                    </span>
                  ) : "—"}
                </Td>
                <Td right mono className={up ? "text-[var(--success)] font-semibold" : "text-[var(--danger)] font-semibold"}>
                  {r.netPnl !== null ? practiceRupee(r.netPnl, { sign: true }) : "—"}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn("text-xs uppercase tracking-wider font-medium py-2 px-3 whitespace-nowrap", right ? "text-right" : "text-left")}>
      {children}
    </th>
  );
}

function Td({
  children, right, mono, muted, className,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td className={cn("py-2.5 px-3 whitespace-nowrap", right ? "text-right" : "text-left", mono && "tabular-nums", muted && "text-[var(--neutral-500)]", className)}>
      {children}
    </td>
  );
}
