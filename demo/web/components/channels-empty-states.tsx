"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Power, Radio, Sparkles } from "lucide-react";
import { setServiceStatus } from "@/app/(app)/actions";

/**
 * State A — Trading Service hasn't been started yet.
 * Lets the user start the engine RIGHT HERE without bouncing to the dashboard.
 */
export function StartServiceFromChannelsEmpty({ tgConnected }: { tgConnected: boolean }) {
  const [pending, startTransition] = useTransition();

  const onStart = () => {
    startTransition(async () => {
      await setServiceStatus("running");
      // Page revalidates via revalidatePath inside the action; layout refresh follows.
    });
  };

  return (
    <div className="rounded-xl border border-[var(--tradex-orange-500)]/30 bg-gradient-to-br from-[var(--tradex-orange-500)]/10 to-[var(--neutral-900)] p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--tradex-orange-500)]/15 text-[var(--tradex-orange-500)] flex items-center justify-center mx-auto mb-4">
        <Sparkles size={26} />
      </div>
      <h2 className="text-lg font-semibold">Discover your channels</h2>
      <p className="text-sm text-[var(--neutral-400)] mt-2 max-w-md mx-auto leading-relaxed">
        {tgConnected
          ? "We're ready to sync your Telegram channel list. This usually starts automatically after connection; if not, start it here and you'll be able to pick channels in about a minute."
          : "Once your Telegram is connected, start the Trading Service and we'll pull your channel list automatically."}
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={pending || !tgConnected}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-medium transition"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
        {pending ? "Starting…" : "Start channel sync"}
      </button>
      <div className="text-[10px] text-[var(--neutral-500)] mt-4">
        You can stop the service any time from the Dashboard. Practice ₹ only — no real money.
      </div>
    </div>
  );
}

/**
 * State B — Service is running, channels haven't synced yet.
 * Polls /api/dashboard via TanStack Query (already used for service status elsewhere).
 * As soon as the user has any channel, calls router.refresh() to drop into State C.
 */
export function ChannelsSyncingState() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      return (await r.json()) as { counts: { channelsSelected: number }; serviceStatus: string };
    },
    refetchInterval: 5_000,
  });

  // The /api/dashboard response includes only SELECTED channels — fall back to a separate
  // count via /api/portfolio? No — simpler: if we ever go from "0 channels in this server-component
  // render" to "any channels exist," refresh. We hit a tiny dedicated endpoint to ask.
  const { data: chanCount } = useQuery({
    queryKey: ["channels-count"],
    queryFn: async () => {
      const r = await fetch("/api/channels-count");
      const j = (await r.json()) as { total: number };
      return j.total;
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if ((chanCount ?? 0) > 0) {
      router.refresh();
    }
  }, [chanCount, router]);

  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-10 text-center">
      <div className="flex items-center justify-center gap-3 mb-3">
        <Loader2 className="animate-spin text-[var(--tradex-orange-500)]" size={22} />
        <Radio size={20} className="text-[var(--info)]" />
      </div>
      <h2 className="text-base font-semibold">Syncing your Telegram channel list…</h2>
      <p className="text-sm text-[var(--neutral-400)] mt-2 max-w-md mx-auto leading-relaxed">
        We're pulling the channels and groups your Telegram account is a member of. This usually
        takes <span className="text-[var(--neutral-200)]">about 60 seconds</span>. The page will
        refresh automatically as soon as channels arrive.
      </p>
      {data?.serviceStatus !== "running" && (
        <p className="text-xs text-[var(--warning)] mt-3">
          Service status: {data?.serviceStatus ?? "unknown"} — if this stays for more than a minute,
          go to the Dashboard and check the Trading Service card.
        </p>
      )}
      <div className="text-[10px] text-[var(--neutral-500)] mt-4 tabular-nums">
        Polling every 5s · {chanCount ?? 0} channels found so far
      </div>
    </div>
  );
}
