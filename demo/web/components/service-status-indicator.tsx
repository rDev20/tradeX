"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function ServiceStatusIndicator() {
  const { data } = useQuery({
    queryKey: ["service-status"],
    queryFn: async () => {
      const r = await fetch("/api/service");
      return (await r.json()) as { status: "running" | "stopped" };
    },
    refetchInterval: 3000,
  });
  const running = data?.status === "running";
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs",
        running
          ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
          : "border-[var(--neutral-700)] bg-[var(--neutral-800)]/50 text-[var(--neutral-400)]",
      )}
    >
      <span className={cn(running && "pulse-dot")}>
        {!running && <span className="inline-block w-2 h-2 rounded-full bg-[var(--neutral-500)] mr-2" />}
      </span>
      {running ? "Service Live" : "Service Stopped"}
    </div>
  );
}
