"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { CheckCircle2, Clock3, Radio, ShieldCheck, WifiOff } from "lucide-react";
import {
  type DashboardGuidanceInput,
  lastSyncAt,
  missionStatusText,
} from "@/lib/dashboard-guidance";
import { cn, relativeTime } from "@/lib/utils";

export function MissionStatusStrip() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      return (await r.json()) as DashboardGuidanceInput;
    },
    refetchInterval: 5000,
  });

  if (!data) {
    return (
      <section className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-3">
        <div className="h-7 w-full animate-pulse rounded bg-[var(--neutral-800)]" />
      </section>
    );
  }

  const syncAt = lastSyncAt(data);
  const connected = data.telegram.connected;
  const running = data.serviceStatus === "running";

  return (
    <section
      aria-label={missionStatusText(data)}
      className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)]/90 px-3 py-3"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StatusPill
          icon={<ShieldCheck size={14} />}
          label="Paper Trading"
          tone="brand"
        />
        <StatusPill
          icon={connected ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}
          label={connected ? "Telegram connected" : "Telegram needed"}
          tone={connected ? "success" : "warning"}
        />
        <StatusPill
          icon={<Radio size={14} />}
          label={`${data.counts.channelsSelected} ${
            data.counts.channelsSelected === 1 ? "channel" : "channels"
          } selected`}
          tone={data.counts.channelsSelected > 0 ? "info" : "neutral"}
        />
        <StatusPill
          icon={<Radio size={14} />}
          label={running ? "Service live" : "Service stopped"}
          tone={running ? "success" : "neutral"}
          live={running}
        />
        {syncAt && (
          <StatusPill
            icon={<Clock3 size={14} />}
            label={`Last sync ${relativeTime(syncAt)}`}
            tone="neutral"
          />
        )}
      </div>
    </section>
  );
}

function StatusPill({
  icon,
  label,
  tone,
  live,
}: {
  icon: ReactNode;
  label: string;
  tone: "brand" | "success" | "warning" | "info" | "neutral";
  live?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 py-1.5 font-medium",
        tone === "brand" &&
          "border-[var(--tradex-orange-500)]/35 bg-[var(--tradex-orange-500)]/10 text-[var(--tradex-orange-300)]",
        tone === "success" &&
          "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]",
        tone === "warning" &&
          "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]",
        tone === "info" && "border-[var(--info)]/30 bg-[var(--info)]/10 text-[var(--info)]",
        tone === "neutral" &&
          "border-[var(--neutral-800)] bg-[var(--neutral-950)] text-[var(--neutral-300)]",
      )}
    >
      <span className={cn("flex items-center", live && "pulse-dot")}>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
