import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function practiceRupee(v: number | null | undefined, opts: { sign?: boolean } = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "Practice ₹ —";
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const prefix = opts.sign ? (v >= 0 ? "+" : "-") : v < 0 ? "-" : "";
  return `Practice ₹ ${prefix}${formatted}`;
}

export function rupee(v: number | null | undefined, opts: { sign?: boolean } = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "₹ —";
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const prefix = opts.sign ? (v >= 0 ? "+" : "-") : v < 0 ? "-" : "";
  return `₹ ${prefix}${formatted}`;
}

export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const prefix = v >= 0 ? "+" : "";
  return `${prefix}${v.toFixed(2)}%`;
}

export function relativeTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
