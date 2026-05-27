import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock3, MessageSquare, Radio, Signal } from "lucide-react";
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
        take: 12,
        include: { signal: true },
      },
      signals: {
        orderBy: { parsedAt: "desc" },
        take: 8,
      },
    },
  });
  if (!channel) notFound();

  const [messagesToday, parsedToday, latestMessage] = await Promise.all([
    db.sourceMessage.count({ where: { channelId: id, postedAt: { gte: today } } }),
    db.sourceSignal.count({ where: { channelId: id, parsedAt: { gte: today } } }),
    db.sourceMessage.findFirst({ where: { channelId: id }, orderBy: { postedAt: "desc" } }),
  ]);
  const parseRate = messagesToday > 0 ? Math.round((parsedToday / messagesToday) * 100) : 0;

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
              Source Channel
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
                  ? "rounded-md border border-[var(--neutral-700)] px-3 py-2 text-sm text-[var(--neutral-300)] hover:bg-[var(--neutral-800)] transition"
                  : "rounded-md bg-[var(--tradex-orange-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--tradex-orange-600)] transition"
              }
            >
              {channel.selected ? "Stop global broadcast" : "Use as global broadcast"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={<Radio size={18} />} label="Global status" value={channel.selected ? "Live" : "Off"} />
        <Stat icon={<MessageSquare size={18} />} label="Messages today" value={`${messagesToday}`} />
        <Stat icon={<Signal size={18} />} label="Parsed calls today" value={`${parsedToday}`} />
        <Stat icon={<Check size={18} />} label="Parse efficiency" value={`${parseRate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">Latest messages</h2>
            <span className="text-xs text-[var(--neutral-500)]">
              {latestMessage ? `Last ${latestMessage.postedAt.toLocaleString()}` : "No messages yet"}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {channel.messages.length > 0 ? (
              channel.messages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--neutral-500)]">
                    <span>{message.postedAt.toLocaleString()}</span>
                    <span className={message.signal ? "text-[var(--success)]" : "text-[var(--neutral-500)]"}>
                      {message.signal ? "Parsed call" : message.parsed ? "Parsed, no call" : "Pending parse"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-[var(--neutral-300)]">
                    {message.text}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--neutral-500)]">No source messages captured for this channel yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
          <h2 className="text-sm font-semibold">Parsed call requests</h2>
          <div className="mt-4 space-y-3">
            {channel.signals.length > 0 ? (
              channel.signals.map((signal) => (
                <article key={signal.id} className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{signal.symbol}</div>
                    <span className="rounded border border-[var(--info)]/30 bg-[var(--info)]/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--info)]">
                      {signal.side}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--neutral-400)]">
                    <span>Entry {formatNumber(signal.entry)}</span>
                    <span>Target {signal.target == null ? "-" : formatNumber(signal.target)}</span>
                    <span>SL {signal.stopLoss == null ? "-" : formatNumber(signal.stopLoss)}</span>
                    <span>Confidence {Math.round(signal.confidence * 100)}%</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--neutral-500)]">
                    <Clock3 size={12} />
                    {signal.parsedAt.toLocaleString()}
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--neutral-500)]">No valid call requests parsed yet.</p>
            )}
          </div>
        </section>
      </div>
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}
