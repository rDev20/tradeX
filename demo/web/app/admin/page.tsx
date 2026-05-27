import Link from "next/link";
import { BarChart3, Clock3, MessageCircle, Radio, Signal, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminPage() {
  const admin = await requireAdminUser();
  const today = startOfIstDay();
  const marketClosed = isAfterMarketCloseIst();
  const [telegram, channelCount, selectedChannels, messageCount, todayMessages, todaySignals, userCount, lastMessage, ticks] =
    await Promise.all([
      db.userTelegramAccount.findUnique({ where: { userId: admin.id } }),
      db.sourceChannel.count(),
      db.sourceChannel.findMany({
        where: { selected: true },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { messages: true, signals: true } } },
      }),
      db.sourceMessage.count(),
      db.sourceMessage.count({ where: { postedAt: { gte: today } } }),
      db.sourceSignal.count({ where: { parsedAt: { gte: today } } }),
      db.user.count({ where: { role: "user" } }),
      db.sourceMessage.findFirst({
        orderBy: { postedAt: "desc" },
        include: { channel: true },
      }),
      db.priceTick.findMany({
        orderBy: { at: "desc" },
        take: 80,
        include: { symbol: true },
      }),
    ]);
  const marketStrip = latestTicksByTicker(ticks).slice(0, 18);
  const selectedCount = selectedChannels.length;
  const parseRate = todayMessages > 0 ? Math.round((todaySignals / todayMessages) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[var(--neutral-500)]">
          Admin Console
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Signal source control</h1>
        <p className="text-sm text-[var(--neutral-400)] mt-2 max-w-2xl">
          Karaan Bansall's Telegram account is the single source for channel messages. Users consume
          these signals through their own trading floor and risk settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={<MessageCircle size={18} />} label="Telegram" value={telegram?.connectedAt ? "Connected" : "Pending"} />
        <Stat icon={<Radio size={18} />} label="Source channels" value={`${selectedCount}/${channelCount}`} />
        <Stat icon={<Signal size={18} />} label="Messages captured" value={`${messageCount}`} />
        <Stat icon={<Users size={18} />} label="Users" value={`${userCount}`} />
      </div>

      <section className="overflow-hidden rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)]">
        <div className="flex items-center justify-between border-b border-[var(--neutral-800)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 size={16} className="text-[var(--tradex-orange-500)]" />
            Latest market strip
          </div>
          <div className="text-xs text-[var(--neutral-500)]">
            {marketClosed ? "Trade day closed" : "Trade day open"}
          </div>
        </div>
        {marketStrip.length > 0 ? (
          <div className="market-strip py-3">
            <div className="market-strip-track">
              {[...marketStrip, ...marketStrip].map((tick, index) => (
                <span key={`${tick.ticker}-${index}`} className="market-pill">
                  <span className="font-medium text-[var(--neutral-100)]">{tick.ticker.replace(".NS", "")}</span>
                  <span>{formatMoney(tick.price)}</span>
                  <span className={tick.change != null && tick.change < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}>
                    {tick.change == null ? "0.00" : `${tick.change >= 0 ? "+" : ""}${tick.change.toFixed(2)}`}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 text-sm text-[var(--neutral-500)]">Waiting for latest market ticks.</div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={<Clock3 size={18} />} label="Today's messages" value={`${todayMessages}`} />
        <Stat icon={<Signal size={18} />} label="Parsed calls today" value={`${todaySignals}`} />
        <Stat icon={<BarChart3 size={18} />} label="Logic efficiency" value={`${parseRate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
          <h2 className="text-sm font-semibold">Global broadcast channel</h2>
          {selectedChannels.length > 0 ? (
            <div className="mt-3 space-y-3">
              {selectedChannels.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/admin/channels/${channel.id}`}
                  className="block rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-950)] p-4 hover:border-[var(--tradex-orange-500)]/60 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{channel.name}</div>
                      <div className="mt-1 text-xs text-[var(--neutral-500)]">
                        {channel.username ? `@${channel.username}` : `Telegram ID ${channel.tgId}`}
                      </div>
                    </div>
                    <span className="rounded border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--success)]">
                      Live
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--neutral-400)]">
                    <span>{channel._count.messages} messages</span>
                    <span>{channel._count.signals} parsed calls</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--neutral-500)] mt-3">
              No global source channel selected yet.
            </p>
          )}
        </section>

        <section className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
          <h2 className="text-sm font-semibold">Next setup step</h2>
          <p className="text-sm text-[var(--neutral-400)] mt-2">
            Connect the admin Telegram account, start the worker, then select source channels as
            they sync into the admin channel list.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/admin/telegram" className="rounded-md bg-[var(--tradex-orange-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--tradex-orange-600)] transition">
              Telegram
            </Link>
            <Link href="/admin/channels" className="rounded-md border border-[var(--neutral-700)] px-3 py-2 text-sm text-[var(--neutral-200)] hover:bg-[var(--neutral-800)] transition">
              Channels
            </Link>
          </div>
        </section>

        <section className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
          <h2 className="text-sm font-semibold">Latest source message</h2>
          {lastMessage ? (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-[var(--neutral-500)]">
                {lastMessage.channel.name} · {lastMessage.postedAt.toLocaleString()}
              </div>
              <p className="text-sm text-[var(--neutral-300)] line-clamp-4">{lastMessage.text}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--neutral-500)] mt-3">
              No admin Telegram messages have been captured yet.
            </p>
          )}
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

function isAfterMarketCloseIst() {
  const now = new Date();
  const istMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330;
  const minutesInDay = istMinutes % (24 * 60);
  return minutesInDay >= 15 * 60 + 30;
}

function latestTicksByTicker<T extends { ticker: string; price: number; change: number | null }>(ticks: T[]) {
  const seen = new Set<string>();
  const latest: T[] = [];
  for (const tick of ticks) {
    if (seen.has(tick.ticker)) continue;
    seen.add(tick.ticker);
    latest.push(tick);
  }
  return latest;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}
