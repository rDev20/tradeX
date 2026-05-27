import { logout } from "@/app/(app)/actions";
import { ServiceStatusIndicator } from "./service-status-indicator";

export function TopBar({ displayName, email }: { displayName: string; email: string }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--neutral-800)] bg-[var(--neutral-900)] px-6 h-14">
      <div className="flex items-center gap-6">
        <a href="/" className="text-xl font-semibold tracking-tight">
          trade<span className="brand-orange">X</span>
        </a>
        <span className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)] border border-[var(--neutral-700)] rounded px-1.5 py-0.5">
          Beta
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <ServiceStatusIndicator />
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[var(--neutral-200)]">{displayName}</span>
          <span className="text-[10px] text-[var(--neutral-500)]">{email}</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs text-[var(--neutral-400)] hover:text-[var(--neutral-50)] transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
