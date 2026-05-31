import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, Check, Clock3, MessageSquare, Radio, Signal, TrendingDown, TrendingUp } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setSourceChannelSelected } from "../actions";
import { AdminChannelAutoRefresh } from "./admin-channel-auto-refresh";

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
        orderBy: [{ postedAt: "desc" }, { id: "desc" }],
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
  const parsedMessages = channel.messages.filter((message) => message.signal);
  const latestMessage = channel.messages[0] ?? null;
  const receiveHealth = getReceiveHealth(channel.selected, latestMessage);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminChannelAutoRefresh />
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
                Newest first, with the original Telegram timestamp.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {latestMessage && (
                <span className="rounded border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--success)]">
                  Latest {formatTimestamp(latestMessage.postedAt)}
                </span>
              )}
              <span className="rounded border border-[var(--neutral-700)] px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--neutral-400)]">
                {channel._count.messages} total
              </span>
            </div>
          </div>

          <div className="telegram-chat-bg max-h-[72vh] overflow-y-auto px-4 py-5">
            {channel.messages.length > 0 ? (
              <div className="space-y-4">
                {channel.messages.map((message, index) => (
                  <article key={message.id} className="flex justify-start">
                    <div
                      className={
                        index === 0
                          ? "telegram-message-bubble border-[var(--success)]/45 bg-[var(--success)]/5 shadow-[0_0_0_1px_rgba(34,197,94,0.12)]"
                          : "telegram-message-bubble"
                      }
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-[var(--tradex-orange-300)]">
                            {channel.name}
                          </span>
                          {index === 0 && (
                            <span className="rounded border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--success)]">
                              Latest
                            </span>
                          )}
                        </div>
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
                        ) : message.parseStatus === "needs_review" ? (
                          <span className="rounded border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-2 py-1 text-[var(--warning)]">
                            Needs review
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

      <section className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Activity size={16} className={receiveHealth.toneClass} />
              <h2 className="text-sm font-semibold">Message receive engine</h2>
              <span className={`rounded border px-2 py-1 text-[10px] uppercase tracking-widest ${receiveHealth.badgeClass}`}>
                {receiveHealth.quality}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--neutral-500)]">
              Real-time Telegram handler plus history backfill. Status is inferred from the latest stored message on this channel.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <EngineMetric label="Telegram time" value={latestMessage ? formatTimestamp(latestMessage.postedAt) : "-"} />
            <EngineMetric label="Portal received" value={latestMessage ? formatTimestamp(latestMessage.createdAt) : "-"} />
            <EngineMetric label="Receive latency" value={receiveHealth.latencyLabel} toneClass={receiveHealth.toneClass} />
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {receiveHealth.steps.map((step) => (
            <div key={step.label} className="rounded border border-[var(--neutral-800)] bg-[var(--neutral-950)] px-3 py-2">
              <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest ${step.toneClass}`}>
                <span className={`h-2 w-2 rounded-full ${step.dotClass}`} />
                {step.status}
              </div>
              <div className="mt-2 text-xs font-medium text-[var(--neutral-200)]">{step.label}</div>
            </div>
          ))}
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

function EngineMetric({
  label,
  value,
  toneClass = "text-[var(--neutral-200)]",
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded border border-[var(--neutral-800)] bg-[var(--neutral-950)] px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        <Clock3 size={12} />
        {label}
      </div>
      <div className={`mt-1 text-xs font-medium ${toneClass}`}>{value}</div>
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

function getReceiveHealth(
  selected: boolean,
  latestMessage: { postedAt: Date; createdAt: Date; parsed: boolean; signal: unknown } | null,
) {
  if (!selected) {
    return {
      quality: "Off",
      latencyLabel: "-",
      toneClass: "text-[var(--neutral-500)]",
      badgeClass: "border-[var(--neutral-700)] text-[var(--neutral-400)]",
      steps: engineSteps([
        ["Socket connection", "Off", "neutral"],
        ["Waiting for update", "Paused", "neutral"],
        ["Message received", "No feed", "neutral"],
        ["Message pushed", "No feed", "neutral"],
        ["Message shown", "No feed", "neutral"],
      ]),
    };
  }

  if (!latestMessage) {
    return {
      quality: "Waiting",
      latencyLabel: "-",
      toneClass: "text-[var(--warning)]",
      badgeClass: "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]",
      steps: engineSteps([
        ["Socket connection", "Ready", "success"],
        ["Waiting for update", "Active", "warning"],
        ["Message received", "Pending", "neutral"],
        ["Message pushed", "Pending", "neutral"],
        ["Message shown", "Pending", "neutral"],
      ]),
    };
  }

  const latencyMs = Math.max(0, latestMessage.createdAt.getTime() - latestMessage.postedAt.getTime());
  const latencySeconds = latencyMs / 1000;
  const quality =
    latencySeconds <= 5 ? "Excellent" : latencySeconds <= 30 ? "Good" : latencySeconds <= 120 ? "Delayed" : "Backfill";
  const tone =
    latencySeconds <= 30 ? "success" : latencySeconds <= 120 ? "warning" : "danger";
  const parsedStatus = latestMessage.signal ? "Parsed" : latestMessage.parsed ? "No call" : "Parsing";

  return {
    quality,
    latencyLabel: formatLatency(latencyMs),
    toneClass: toneClass(tone),
    badgeClass: badgeClass(tone),
    steps: engineSteps([
      ["Socket connection", "Connected", "success"],
      ["Waiting for update", "Active", "success"],
      ["Message received", "Done", tone],
      ["Message pushed", "Stored", tone],
      ["Message shown", parsedStatus, latestMessage.parsed ? "success" : "warning"],
    ]),
  };
}

function engineSteps(rows: [label: string, status: string, tone: "success" | "warning" | "danger" | "neutral"][]) {
  return rows.map(([label, status, tone]) => ({
    label,
    status,
    toneClass: toneClass(tone),
    dotClass: dotClass(tone),
  }));
}

function toneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "text-[var(--success)]";
  if (tone === "warning") return "text-[var(--warning)]";
  if (tone === "danger") return "text-[var(--danger)]";
  return "text-[var(--neutral-500)]";
}

function dotClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "bg-[var(--success)]";
  if (tone === "warning") return "bg-[var(--warning)]";
  if (tone === "danger") return "bg-[var(--danger)]";
  return "bg-[var(--neutral-600)]";
}

function badgeClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]";
  if (tone === "warning") return "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]";
  if (tone === "danger") return "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]";
  return "border-[var(--neutral-700)] text-[var(--neutral-400)]";
}

function formatLatency(milliseconds: number) {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} sec`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
}
