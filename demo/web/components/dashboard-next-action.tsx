"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
  MessageCircle,
  PlayCircle,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { setServiceStatus } from "@/app/(app)/actions";
import {
  decideNextAction,
  type DashboardGuidanceInput,
  type DashboardNextAction as NextAction,
} from "@/lib/dashboard-guidance";
import { cn } from "@/lib/utils";

export function DashboardNextAction() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      return (await r.json()) as DashboardGuidanceInput;
    },
    refetchInterval: 5000,
  });
  const [pending, startTransition] = useTransition();

  if (!data) {
    return (
      <section className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
        <div className="h-40 animate-pulse rounded-lg bg-[var(--neutral-800)]" />
      </section>
    );
  }

  const action = decideNextAction(data);
  const running = data.serviceStatus === "running";

  const startService = () => {
    startTransition(async () => {
      await setServiceStatus("running");
    });
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border p-5",
        action.tone === "success"
          ? "border-[var(--success)]/35 bg-[var(--success)]/10"
          : action.tone === "info"
            ? "border-[var(--info)]/25 bg-[var(--info)]/8"
            : "border-[var(--tradex-orange-500)]/35 bg-[var(--tradex-orange-500)]/10",
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",
                action.tone === "success"
                  ? "bg-[var(--success)]/15 text-[var(--success)]"
                  : action.tone === "info"
                    ? "bg-[var(--info)]/15 text-[var(--info)]"
                    : "bg-[var(--tradex-orange-500)]/15 text-[var(--tradex-orange-300)]",
              )}
            >
              {running && <span className="pulse-dot" />}
              {action.eyebrow}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neutral-800)] bg-[var(--neutral-950)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--neutral-400)]">
              <ShieldCheck size={12} />
              Practice money only
            </span>
          </div>

          <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-[var(--neutral-50)] md:text-3xl">
            {action.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--neutral-300)]">
            {action.body}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PrimaryAction action={action} pending={pending} onStartService={startService} />
            <Link
              href="/trading-floor"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--neutral-700)] bg-[var(--neutral-900)] px-4 py-2 text-sm font-semibold text-[var(--neutral-200)] transition hover:border-[var(--neutral-600)] hover:bg-[var(--neutral-800)]"
            >
              <Radio size={16} />
              Trading Floor
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-950)] p-4">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--neutral-500)]">
            Cockpit readiness
          </div>
          <div className="space-y-2">
            <ReadinessItem
              done={data.telegram.connected}
              icon={<MessageCircle size={14} />}
              label="Telegram connected"
              detail={data.telegram.username ? `@${data.telegram.username}` : data.telegram.phone ?? "Required"}
            />
            <ReadinessItem
              done={data.counts.channelsSelected > 0}
              icon={<SlidersHorizontal size={14} />}
              label="Channels selected"
              detail={`${data.counts.channelsSelected} selected`}
            />
            <ReadinessItem
              done={running}
              icon={<PlayCircle size={14} />}
              label="Service watching"
              detail={running ? "Live polling enabled" : "Start when ready"}
            />
            <ReadinessItem
              done={data.counts.tradesToday > 0 || data.counts.messagesToday > 0}
              icon={<Radio size={14} />}
              label="Trade slips visible"
              detail={`${data.counts.messagesToday} msgs, ${data.counts.tradesToday} trades today`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PrimaryAction({
  action,
  pending,
  onStartService,
}: {
  action: NextAction;
  pending: boolean;
  onStartService: () => void;
}) {
  const classes =
    "inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--tradex-orange-500)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--tradex-orange-600)] disabled:cursor-not-allowed disabled:opacity-60";

  if (action.kind === "service") {
    return (
      <button onClick={onStartService} disabled={pending} className={classes}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
        {pending ? "Starting..." : action.label}
      </button>
    );
  }

  return (
    <Link href={action.href} className={classes}>
      {action.label}
      <ArrowRight size={16} />
    </Link>
  );
}

function ReadinessItem({
  done,
  icon,
  label,
  detail,
}: {
  done: boolean;
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-3">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          done
            ? "bg-[var(--success)]/15 text-[var(--success)]"
            : "bg-[var(--neutral-800)] text-[var(--neutral-500)]",
        )}
      >
        {done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--neutral-100)]">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="truncate text-xs text-[var(--neutral-500)]">{detail}</div>
      </div>
    </div>
  );
}
