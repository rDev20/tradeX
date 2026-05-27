"use client";

import { useEffect, useState } from "react";
import { CircleDot, Clock } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { marketStatus, formatIST, formatTimeRemaining } from "@/lib/market-hours";

export function MarketStatusBar({ lastTickAt }: { lastTickAt: string | null }) {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const status = marketStatus(now);
  const open = status.state === "open";

  return (
    <div className="rounded-xl border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-4 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-3">
        <CircleDot
          size={18}
          className={open ? "text-[var(--success)]" : "text-[var(--neutral-500)]"}
        />
        <div>
          <div className="text-sm font-semibold">
            {open ? (
              <span className="text-[var(--success)]">NSE Market Open</span>
            ) : (
              <span className="text-[var(--neutral-300)]">NSE Market Closed</span>
            )}
          </div>
          <div className="text-xs text-[var(--neutral-500)]">
            Trading hours · 09:15 to 15:30 IST · Mon to Fri
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:border-l md:border-[var(--neutral-800)] md:pl-6">
        {open && status.state === "open" ? (
          <>
            <Field label="Closes at" value={formatIST(status.closesAt)} />
            <Field
              label="Closes in"
              value={formatTimeRemaining(status.closesAt, now)}
            />
          </>
        ) : (
          status.state === "closed" && (
            <>
              <Field
                label="Last close"
                value={status.lastClose ? formatIST(status.lastClose) : "—"}
              />
              <Field
                label="Next open"
                value={`${formatIST(status.nextOpen)} · in ${formatTimeRemaining(status.nextOpen, now)}`}
              />
            </>
          )
        )}
      </div>

      <div className="text-[10px] text-[var(--neutral-500)] md:text-right">
        <div className="uppercase tracking-widest">Data source</div>
        <div className="mt-0.5">
          <a
            href="https://finance.yahoo.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--neutral-300)] underline"
          >
            Yahoo Finance
          </a>{" "}
          via <span className="font-mono">yfinance</span>
        </div>
        <div className="mt-0.5 flex items-center justify-end gap-1">
          <Clock size={10} />
          {lastTickAt ? `tick ${relativeTime(lastTickAt)}` : "no ticks yet"}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">
        {label}
      </div>
      <div className="text-sm tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

export function NotTradingPill() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const status = marketStatus(now);
  if (status.state === "open") return null;
  return (
    <span
      className={cn(
        "text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded font-semibold",
        "bg-[var(--neutral-800)] text-[var(--neutral-400)]",
      )}
      title="Market is currently closed — these are last-known prices"
    >
      Not trading
    </span>
  );
}
