import { Check, Radio } from "lucide-react";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { setSourceChannelSelected } from "./actions";

export default async function AdminChannelsPage() {
  await requireAdminUser();
  const channels = await db.sourceChannel.findMany({
    orderBy: [{ selected: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { messages: true, signals: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[var(--neutral-500)]">
          Source Channels
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Select Telegram channels</h1>
        <p className="text-sm text-[var(--neutral-400)] mt-2 max-w-2xl">
          These channels are read from the admin Telegram account. One selected channel feeds the
          global source message stream in real time.
        </p>
      </div>

      {channels.length === 0 ? (
        <div className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-6 text-sm text-[var(--neutral-400)]">
          No source channels have synced yet. Connect admin Telegram and start the worker so it can
          discover channels.
        </div>
      ) : (
        <div className="grid gap-3">
          {channels.map((channel) => (
            <article
              key={channel.id}
              className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-[var(--info)]" />
                  <h2 className="font-medium truncate">{channel.name}</h2>
                  {channel.selected && (
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--success)]">
                      <Check size={12} />
                      Live
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-[var(--neutral-500)]">
                  {channel.username ? `@${channel.username}` : `Telegram ID ${channel.tgId}`} ·{" "}
                  {channel._count.messages} messages · {channel._count.signals} signals
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/channels/${channel.id}`}
                  className="rounded-md border border-[var(--neutral-700)] px-3 py-2 text-sm text-[var(--neutral-200)] hover:bg-[var(--neutral-800)] transition"
                >
                  Details
                </Link>
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
                    {channel.selected ? "Stop reading" : "Use globally"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
