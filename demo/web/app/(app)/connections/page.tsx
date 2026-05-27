import { db } from "@/lib/db";
import { Check, MessageCircle, TrendingUp } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const userId = await requireUserId();
  const tg = await db.userTelegramAccount.findUnique({ where: { userId } });
  const channels = await db.channel.count({ where: { userId } });
  const selected = await db.channel.count({ where: { userId, selected: true } });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="text-sm text-[var(--neutral-400)] mt-1">
          Link your Telegram and broker to start ingesting signals.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--info)]/15 text-[var(--info)] flex items-center justify-center shrink-0">
              <MessageCircle size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">Telegram</div>
                {tg?.connectedAt ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-full">
                    <Check size={12} /> Connected
                  </span>
                ) : (
                  <span className="text-xs text-[var(--neutral-500)]">Not connected</span>
                )}
              </div>
              {tg?.connectedAt ? (
                <div className="mt-1 text-sm text-[var(--neutral-400)]">
                  {tg.tgFirstName} {tg.tgUsername && <>· @{tg.tgUsername}</>} · {tg.phone}
                  <div className="text-xs text-[var(--neutral-500)] mt-1">
                    Connected {relativeTime(tg.connectedAt)} ·{" "}
                    {channels} channels synced ·{" "}
                    {selected} selected for evaluation
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-[var(--neutral-400)]">
                  Telethon session authenticated via server-side. Start the Trading Service to
                  populate channels and messages.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5 opacity-75">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--neutral-800)] text-[var(--neutral-500)] flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">Broker</div>
                <span className="text-xs text-[var(--neutral-500)] bg-[var(--neutral-800)] px-2 py-0.5 rounded-full">
                  Coming in phase 2
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--neutral-400)]">
                Zerodha Kite, Upstox, Dhan integrations via the broker adapter contract.
                For this demo, all execution stays in paper-trading mode — no real orders are placed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
