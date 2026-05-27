import Link from "next/link";
import { Radio, ArrowRight, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function ConnectChannelsCTA() {
  const userId = await requireUserId();

  const [selectedCount, totalCount, tgAccount, serviceStatus] = await Promise.all([
    db.channel.count({ where: { userId, selected: true } }),
    db.channel.count({ where: { userId } }),
    db.userTelegramAccount.findUnique({ where: { userId } }),
    db.userServiceStatus.findUnique({ where: { userId } }),
  ]);

  // Hide once user has at least one channel under evaluation
  if (selectedCount > 0) return null;

  const tgConnected = !!tgAccount?.connectedAt;
  const isRunning = serviceStatus?.status === "running";

  // Three honest scenarios — copy matches what /channels will actually show
  let title: string;
  let body: string;
  let cta: string;

  if (!tgConnected) {
    title = "Connect your Telegram first";
    body =
      "Once your Telegram is linked from Connections, you'll be able to discover the signal channels you follow.";
    cta = "Go to Connections";
  } else if (totalCount === 0 && !isRunning) {
    title = "Discover your channels";
    body =
      "Open the channels page and start the engine — we'll pull your Telegram channel list within ~60 seconds.";
    cta = "Open channels →";
  } else if (totalCount === 0 && isRunning) {
    title = "Syncing your channel list…";
    body =
      "We're pulling channels from your Telegram. The channels page will populate within ~60 seconds.";
    cta = "View progress";
  } else {
    title = "Pick channels to evaluate";
    body =
      "Your channels are synced. Allocate a Practice ₹ budget to the ones you want to paper-trade.";
    cta = "Choose channels →";
  }

  const href = !tgConnected ? "/connections" : "/channels";

  return (
    <div className="rounded-xl border border-[var(--tradex-orange-500)]/30 bg-gradient-to-br from-[var(--tradex-orange-500)]/10 to-[var(--neutral-900)] p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--tradex-orange-500)]/15 text-[var(--tradex-orange-500)] flex items-center justify-center shrink-0">
          <Sparkles size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tradex-orange-300)]">
            Welcome to tradeX
          </div>
          <h2 className="text-lg font-semibold mt-1">{title}</h2>
          <p className="text-sm text-[var(--neutral-400)] mt-1.5 max-w-2xl">{body}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={href}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] text-white px-5 py-2.5 text-sm font-medium transition"
            >
              <Radio size={16} />
              {cta}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
