import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, MessageSquare, Radio, Signal } from "lucide-react";
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

      <section className="overflow-hidden rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--neutral-800)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Messages as received</h2>
            <p className="mt-1 text-xs text-[var(--neutral-500)]">
              Latest Telegram messages captured from this channel, with received timestamp.
            </p>
          </div>
          <span className="rounded border border-[var(--neutral-700)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--neutral-400)]">
            {channel._count.messages} total
          </span>
        </div>

        <div className="telegram-chat-bg max-h-[68vh] overflow-y-auto px-4 py-5">
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
