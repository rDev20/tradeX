import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { practiceRupee, relativeTime } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChannelDetail({
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
      _count: { select: { messages: true, signals: true, trades: true } },
    },
  });
  if (!channel) notFound();

  const [messages, signals, trades] = await Promise.all([
    db.message.findMany({
      where: { channelId: id, userId },
      orderBy: { postedAt: "desc" },
      take: 30,
    }),
    db.parsedSignal.findMany({
      where: { channelId: id, userId },
      orderBy: { parsedAt: "desc" },
      take: 20,
      include: { trade: true },
    }),
    db.paperTrade.findMany({ where: { channelId: id, userId } }),
  ]);

  const pnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const closed = trades.filter((t) => t.closedAt);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/channels"
          className="inline-flex items-center gap-1 text-xs text-[var(--neutral-400)] hover:text-[var(--neutral-50)] mb-2"
        >
          <ArrowLeft size={12} /> Back to channels
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{channel.name}</h1>
        {channel.username && (
          <div className="text-sm text-[var(--neutral-500)]">@{channel.username}</div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Messages" value={`${channel._count.messages}`} />
        <Stat label="Signals parsed" value={`${channel._count.signals}`} />
        <Stat label="Paper trades" value={`${channel._count.trades}`} />
        <Stat
          label="Win rate"
          value={closed.length > 0 ? `${winRate.toFixed(0)}% (${wins}/${closed.length})` : "—"}
        />
      </div>

      <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5 mb-6">
        <div className="text-xs uppercase tracking-widest text-[var(--neutral-500)]">
          Total Paper P&L
        </div>
        <div
          className={`text-3xl font-semibold tabular-nums mt-1 ${pnl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
        >
          {practiceRupee(pnl, { sign: true })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] mb-3">
            Latest Messages
          </h2>
          <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] divide-y divide-[var(--neutral-800)] max-h-[600px] overflow-auto">
            {messages.length === 0 ? (
              <div className="p-6 text-sm text-[var(--neutral-500)] text-center">
                No messages yet.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="p-4 text-sm">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)] mb-1 flex items-center gap-2">
                    <span>{relativeTime(m.postedAt)}</span>
                    {m.parsed && (
                      <span className="text-[var(--tradex-orange-300)]">· parsed</span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap break-words text-[var(--neutral-200)]">
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--neutral-400)] mb-3">
            Parsed Signals
          </h2>
          <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] divide-y divide-[var(--neutral-800)] max-h-[600px] overflow-auto">
            {signals.length === 0 ? (
              <div className="p-6 text-sm text-[var(--neutral-500)] text-center">
                No signals parsed yet.
              </div>
            ) : (
              signals.map((s) => (
                <div key={s.id} className="p-4 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${s.side === "BUY" ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--danger)]/15 text-[var(--danger)]"}`}
                    >
                      {s.side}
                    </span>
                    <span className="font-semibold">{s.symbol}</span>
                    <span className="text-xs text-[var(--neutral-500)]">{s.instrument}</span>
                    <span className="text-[10px] uppercase bg-[var(--tradex-orange-500)]/15 text-[var(--tradex-orange-300)] px-1.5 rounded">
                      paper
                    </span>
                  </div>
                  <div className="text-xs text-[var(--neutral-400)] tabular-nums">
                    Entry ₹{s.entry}
                    {s.stopLoss && <> · SL ₹{s.stopLoss}</>}
                    {s.target && <> · TGT ₹{s.target}</>}
                  </div>
                  {s.trade && (
                    <div
                      className={`text-xs mt-1 tabular-nums ${(s.trade.pnl ?? 0) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                    >
                      Result: {s.trade.exitReason ?? "OPEN"} ·{" "}
                      {practiceRupee(s.trade.pnl, { sign: true })}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--neutral-600)] mt-1">
                    {relativeTime(s.parsedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        {label}
      </div>
      <div className="text-xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
