import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { practiceRupee, pct, relativeTime } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { StarRating, computeRating } from "@/components/star-rating";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ScorecardDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const channel = await db.channel.findFirst({
    where: { id, userId },
    include: {
      trades: {
        orderBy: { openedAt: "asc" },
        include: { signal: true },
      },
    },
  });
  if (!channel) notFound();

  const trades = channel.trades;
  const closed = trades.filter((t) => t.closedAt);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) <= 0);
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0 ? losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length : 0;

  const budget = channel.budget;

  // "Today" in IST
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs);
  const istMidnight = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0),
  );
  const todayStartUtc = new Date(istMidnight.getTime() - istOffsetMs);

  const todayTrades = trades.filter((t) => new Date(t.openedAt) >= todayStartUtc);
  const beforeTodayPnl = trades
    .filter((t) => new Date(t.openedAt) < todayStartUtc)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const openingBalance = budget + beforeTodayPnl;
  const closingBalance = openingBalance + todayPnl;
  const todayPct = openingBalance > 0 ? (todayPnl / openingBalance) * 100 : 0;
  const lifetimePct = budget > 0 ? (totalPnl / budget) * 100 : 0;

  // equity curve over closed trades
  let peak = 0;
  let maxDD = 0;
  let running = 0;
  const curve: { idx: number; equity: number }[] = [{ idx: 0, equity: 0 }];
  closed.forEach((t, i) => {
    running += t.pnl ?? 0;
    curve.push({ idx: i + 1, equity: running });
    peak = Math.max(peak, running);
    maxDD = Math.min(maxDD, running - peak);
  });

  const rating = computeRating({
    pnlPct: lifetimePct,
    winRate,
    closedTrades: closed.length,
  });

  const todayUp = todayPnl >= 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href="/scorecard"
          className="inline-flex items-center gap-1 text-xs text-[var(--neutral-400)] hover:text-[var(--neutral-50)] mb-2"
        >
          <ArrowLeft size={12} /> All scorecards
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{channel.name}</h1>
        {channel.username && (
          <div className="text-sm text-[var(--neutral-500)]">@{channel.username}</div>
        )}
      </div>

      {/* Star rating block */}
      <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5 mb-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            tradeX rating
          </div>
          <div className="mt-1 flex items-center gap-3">
            <StarRating rating={rating.stars} size={22} />
            <span className="text-lg font-semibold">{rating.verdict}</span>
          </div>
          <p className="text-xs text-[var(--neutral-500)] mt-2 max-w-2xl">{rating.subtext}</p>
        </div>
        <div className="text-xs text-[var(--neutral-500)] md:text-right">
          <div className="uppercase tracking-widest">Allocated budget</div>
          <div className="text-base text-[var(--neutral-100)] tabular-nums mt-0.5">
            {practiceRupee(budget)}
          </div>
        </div>
      </div>

      {/* Today's panel — stock-app style */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] mb-3">
          Today
        </h2>
        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--neutral-800)]">
            <BalanceCell label="Opening balance" value={practiceRupee(openingBalance)} />
            <BalanceCell label="Closing balance" value={practiceRupee(closingBalance)} />
            <BalanceCell
              label="Today's P&L"
              value={practiceRupee(todayPnl, { sign: true })}
              tone={todayPnl === 0 ? "neutral" : todayUp ? "up" : "down"}
              extra={todayTrades.length > 0 ? `${pct(todayPct)} · ${todayTrades.length} trade${todayTrades.length === 1 ? "" : "s"} today` : "no trades today"}
            />
          </div>
        </div>
      </section>

      {/* Lifetime block */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] mb-3">
          Lifetime
        </h2>
        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
          <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
            Total Paper P&L
          </div>
          <div
            className={`text-3xl md:text-4xl font-semibold tabular-nums mt-1 ${totalPnl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
          >
            {practiceRupee(totalPnl, { sign: true })}{" "}
            <span className="text-base font-medium opacity-80">({pct(lifetimePct)})</span>
          </div>
          <div className="text-xs text-[var(--neutral-500)] mt-2">
            On {practiceRupee(budget)} budget · {trades.length} paper trades · {closed.length} closed
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Win rate" value={closed.length > 0 ? `${winRate.toFixed(0)}%` : "—"} />
        <Stat
          label="Wins / Losses"
          value={closed.length > 0 ? `${wins.length} / ${losses.length}` : "—"}
        />
        <Stat label="Avg win" value={practiceRupee(avgWin, { sign: true })} />
        <Stat label="Avg loss" value={practiceRupee(avgLoss, { sign: true })} />
        <Stat label="Max drawdown" value={practiceRupee(maxDD, { sign: true })} />
      </div>

      <section className="mb-6">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] mb-3">
          Equity curve
        </h2>
        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4">
          {curve.length < 2 ? (
            <div className="text-sm text-[var(--neutral-500)] text-center py-8">
              Not enough closed trades yet.
            </div>
          ) : (
            <EquityChart curve={curve} />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] mb-3">
          Trades
        </h2>
        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--neutral-800)]/50 text-[var(--neutral-400)]">
              <tr>
                <Th>Opened</Th>
                <Th>Symbol</Th>
                <Th>Side</Th>
                <Th right>Entry</Th>
                <Th right>Exit</Th>
                <Th>Outcome</Th>
                <Th right>Paper P&L</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--neutral-800)]">
              {trades
                .slice()
                .reverse()
                .map((t) => (
                  <tr key={t.id}>
                    <Td muted>{relativeTime(t.openedAt)}</Td>
                    <Td>{t.symbol}</Td>
                    <Td>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-semibold ${t.side === "BUY" ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--danger)]/15 text-[var(--danger)]"}`}
                      >
                        {t.side}
                      </span>
                    </Td>
                    <Td right mono>
                      ₹{t.entry}
                    </Td>
                    <Td right mono>
                      {t.exit !== null ? `₹${t.exit}` : "—"}
                    </Td>
                    <Td>
                      <span className="text-xs uppercase tracking-wider text-[var(--neutral-400)]">
                        {t.exitReason ?? "OPEN"}
                      </span>
                    </Td>
                    <Td
                      right
                      mono
                      className={
                        (t.pnl ?? 0) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                      }
                    >
                      {t.pnl !== null ? practiceRupee(t.pnl, { sign: true }) : "—"}
                    </Td>
                  </tr>
                ))}
              {trades.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--neutral-500)]">
                    No paper trades yet. Start the Trading Service to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BalanceCell({
  label,
  value,
  tone,
  extra,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
  extra?: string;
}) {
  const color =
    tone === "up"
      ? "text-[var(--success)]"
      : tone === "down"
        ? "text-[var(--danger)]"
        : "text-[var(--neutral-100)]";
  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${color}`}>{value}</div>
      {extra && <div className="text-xs text-[var(--neutral-500)] mt-1">{extra}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        {label}
      </div>
      <div className="text-base font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`text-xs uppercase tracking-wider font-medium py-2 px-3 ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  muted,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`py-2 px-3 ${right ? "text-right" : "text-left"} ${mono ? "tabular-nums" : ""} ${muted ? "text-[var(--neutral-500)]" : ""} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

function EquityChart({ curve }: { curve: { idx: number; equity: number }[] }) {
  const w = 800;
  const h = 160;
  const padding = 24;
  const xs = curve.map((c) => c.idx);
  const ys = curve.map((c) => c.equity);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys, 0);
  const xR = xMax - xMin || 1;
  const yR = yMax - yMin || 1;
  const x = (v: number) => padding + ((v - xMin) / xR) * (w - 2 * padding);
  const y = (v: number) => h - padding - ((v - yMin) / yR) * (h - 2 * padding);
  const d = curve
    .map(
      (c, i) => `${i === 0 ? "M" : "L"}${x(c.idx).toFixed(1)},${y(c.equity).toFixed(1)}`,
    )
    .join(" ");
  const zeroY = y(0);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      <line
        x1={padding}
        x2={w - padding}
        y1={zeroY}
        y2={zeroY}
        stroke="var(--neutral-700)"
        strokeDasharray="2,4"
      />
      <path d={d} stroke="var(--tradex-orange-500)" strokeWidth={2} fill="none" />
    </svg>
  );
}
