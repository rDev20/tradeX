import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, MessageSquare, Radio, Signal, TrendingDown, TrendingUp } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setSourceChannelSelected } from "../actions";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminChannelDetailPage({ params }: PageProps) {
  await requireAdminUser();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) notFound();

  const today = startOfIstDay();
  const channel = await db.sourceChannel.findUnique({
    where: { id },
    include: {
      _count: { select: { messages: true, signals: true } },
      messages: {
        orderBy: { postedAt: "desc" },
        take: 80,
        include: { signal: true },
      },
    },
  });
  if (!channel) notFound();

  const [messagesToday, parsedToday] = await Promise.all([
    db.sourceMessage.count({ where: { channelId: id, postedAt: { gte: today } } }),
    db.sourceSignal.count({ where: { channelId: id, parsedAt: { gte: today } } }),
  ]);
  const parseRate = messagesToday > 0 ? Math.round((parsedToday / messagesToday) * 100) : 0;
  const messagesOldestFirst = [...channel.messages].reverse();
  const parsedMessages = channel.messages.filter((message) => message.signal);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/admin/channels"
          className="inline-flex items-center gap-2 text-sm text-[var(--neutral-400)] hover:text-[var(--neutral-100)]"
        >
          <ArrowLeft size={16} />
          Channels
        </Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-[var(--neutral-500)]">
              Telegram Channel
            </div>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">{channel.name}</h1>
            <p className="mt-2 text-sm text-[var(--neutral-400)]">
              {channel.username ? `@${channel.username}` : `Telegram ID ${channel.tgId}`}
            </p>
          </div>
          <form action={setSourceChannelSelected}>
            <input type="hidden" name="id" value={channel.id} />
            <input type="hidden" name="selected" value={channel.selected ? "false" : "true"} />
            <button
              type="submit"
              className={
                channel.selected
                  ? "rounded-md border border-[var(--success)]/40 bg-[var(--success)]/10 px-4 py-2 text-sm font-medium text-[var(--success)] hover:bg-[var(--success)]/15 transition"
                  : "rounded-md bg-[var(--tradex-orange-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--tradex-orange-600)] transition"
              }
            >
              {channel.selected ? "Global broadcast is ON" : "Use this channel for global broadcast"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={<Radio size={18} />} label="Broadcast" value={channel.selected ? "Live" : "Off"} />
        <Stat icon={<MessageSquare size={18} />} label="Messages today" value={`${messagesToday}`} />
        <Stat icon={<Signal size={18} />} label="Call messages" value={`${parsedToday}`} />
        <Stat icon={<Check size={18} />} label="Parse rate" value={`${parseRate}%`} />
      </div>

      <section className="grid overflow-hidden rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] lg:grid-cols-[1.18fr_0.82fr]">
        <div className="min-w-0 border-b border-[var(--neutral-800)] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-800)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Messages as received</h2>
              <p className="mt-1 text-xs text-[var(--neutral-500)]">
                Raw Telegram messages with the original Telegram timestamp.
              </p>
            </div>
            <span className="rounded border border-[var(--neutral-700)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--neutral-400)]">
              {channel._count.messages} total
            </span>
          </div>

          <div className="telegram-chat-bg max-h-[72vh] overflow-y-auto px-4 py-5">
            {messagesOldestFirst.length > 0 ? (
              <div className="space-y-4">
                {messagesOldestFirst.map((message) => (
                  <article key={message.id} className="flex justify-start">
                    <div className="telegram-message-bubble">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-medium text-[var(--tradex-orange-300)]">
                          {channel.name}
                        </span>
                        <span className="text-[11px] text-[var(--neutral-500)]">
                          {formatTimestamp(message.postedAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--neutral-100)]">
                        {message.text}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
                        {message.signal ? (
                          <span className="rounded border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-1 text-[var(--success)]">
                            Call parsed
                          </span>
                        ) : message.parsed ? (
                          <span className="rounded border border-[var(--neutral-700)] px-2 py-1 text-[var(--neutral-500)]">
                            No call
                          </span>
                        ) : (
                          <span className="rounded border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-2 py-1 text-[var(--warning)]">
                            Pending parse
                          </span>
                        )}
                        {message.signal && (
                          <span className="rounded border border-[var(--info)]/30 bg-[var(--info)]/10 px-2 py-1 text-[var(--info)]">
                            {message.signal.symbol} {message.signal.side} @ {formatNumber(message.signal.entry)}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] p-6 text-sm text-[var(--neutral-500)]">
                No Telegram messages captured for this channel yet.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-800)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Parsed trade intent</h2>
              <p className="mt-1 text-xs text-[var(--neutral-500)]">
                Calls extracted from messages, pinned to the message timestamp.
              </p>
            </div>
            <span className="rounded border border-[var(--neutral-700)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--neutral-400)]">
              {parsedMessages.length} shown
            </span>
          </div>

          <div className="max-h-[72vh] overflow-y-auto p-4">
            {parsedMessages.length > 0 ? (
              <div className="space-y-3">
                {parsedMessages.map((message) => {
                  const signal = message.signal;
                  if (!signal) return null;
                  return (
                    <article key={signal.id} className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-base font-semibold">{signal.symbol}</span>
                            <span className="text-xs text-[var(--neutral-500)]">{signal.instrument}</span>
                          </div>
                          <div className="mt-1 text-xs text-[var(--neutral-500)]">
                            {formatTimestamp(message.postedAt)}
                          </div>
                        </div>
                        <span
                          className={
                            signal.side.toUpperCase() === "SELL"
                              ? "inline-flex items-center gap-1 rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--danger)]"
                              : "inline-flex items-center gap-1 rounded border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--success)]"
                          }
                        >
                          {signal.side.toUpperCase() === "SELL" ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                          {signal.side}
                        </span>
                      </div>

                      <PriceLine entry={signal.entry} stopLoss={signal.stopLoss} target={signal.target} />

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--neutral-300)]">
                        <Metric label="Buy/Sell at" value={formatNumber(signal.entry)} />
                        <Metric label="Stop loss" value={signal.stopLoss == null ? "-" : formatNumber(signal.stopLoss)} />
                        <Metric label="Target" value={signal.target == null ? "-" : formatNumber(signal.target)} />
                        <Metric label="Confidence" value={`${Math.round(signal.confidence * 100)}%`} />
                      </div>

                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--neutral-500)]">{signal.raw}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] p-6 text-sm text-[var(--neutral-500)]">
                No parsed trade calls yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4">
      <div className="flex items-center justify-between text-[var(--neutral-500)]">
        {icon}
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--neutral-800)] bg-[var(--neutral-900)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function PriceLine({
  entry,
  stopLoss,
  target,
}: {
  entry: number;
  stopLoss: number | null;
  target: number | null;
}) {
  const points = [
    stopLoss == null ? null : { label: "SL", value: stopLoss, kind: "sl" },
    { label: "Entry", value: entry, kind: "entry" },
    target == null ? null : { label: "Target", value: target, kind: "target" },
  ].filter(Boolean) as { label: string; value: number; kind: string }[];
  const min = Math.min(...points.map((point) => point.value));
  const max = Math.max(...points.map((point) => point.value));
  const span = Math.max(max - min, 1);

  return (
    <div className="mt-4 rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] px-3 pb-4 pt-7">
      <div className="relative h-2 rounded-full bg-[var(--neutral-800)]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--danger)] via-[var(--tradex-orange-500)] to-[var(--success)]" />
        {points.map((point) => {
          const left = ((point.value - min) / span) * 100;
          return (
            <span
              key={`${point.kind}-${point.value}`}
              className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${left}%` }}
            >
              <span
                className={
                  point.kind === "sl"
                    ? "h-3 w-3 rounded-full border border-[var(--danger)] bg-[var(--neutral-950)]"
                    : point.kind === "target"
                      ? "h-3 w-3 rounded-full border border-[var(--success)] bg-[var(--neutral-950)]"
                      : "h-4 w-4 rounded-full border-2 border-[var(--tradex-orange-500)] bg-[var(--neutral-950)]"
                }
              />
              <span className="whitespace-nowrap text-[10px] text-[var(--neutral-400)]">
                {point.label} {formatNumber(point.value)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function startOfIstDay() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000);
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}
