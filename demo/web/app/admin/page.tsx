import Link from "next/link";
import { MessageCircle, Radio, Signal, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminPage() {
  const admin = await requireAdminUser();
  const [telegram, channelCount, selectedCount, messageCount, userCount, lastMessage] =
    await Promise.all([
      db.userTelegramAccount.findUnique({ where: { userId: admin.id } }),
      db.sourceChannel.count(),
      db.sourceChannel.count({ where: { selected: true } }),
      db.sourceMessage.count(),
      db.user.count({ where: { role: "user" } }),
      db.sourceMessage.findFirst({
        orderBy: { postedAt: "desc" },
        include: { channel: true },
      }),
    ]);

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

      <div className="grid gap-4 lg:grid-cols-2">
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
