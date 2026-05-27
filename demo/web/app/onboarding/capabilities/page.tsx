import { advance } from "./actions";
import { OnboardingProgress } from "@/components/onboarding-progress";

export default function CapabilitiesPage() {
  return (
    <div className="space-y-8">
      <OnboardingProgress step={1} />
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[var(--neutral-500)]">
          Paper trading setup
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">
          Three stages, then the dashboard
        </h1>
        <p className="text-sm text-[var(--neutral-400)] mt-2 max-w-xl">
          You stay in control. We never originate signals, we never touch your real money in this
          beta. Practice ₹ only.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          number={1}
          accent="info"
          title="Connect your Telegram"
          body="Securely link the channels you already follow. Server-side session, encrypted at rest. Your account, your signals."
          icon={<MessageIcon />}
        />
        <Card
          number={2}
          accent="brand"
          title="Watch the AI paper-trade"
          body="Signals are parsed and paper-traded with realistic costs. You see the movement on the Trading Floor."
          icon={<CpuIcon />}
        />
        <Card
          number={3}
          accent="brand"
          title="Select Telegram channels"
          body="After Telegram connects, the dashboard points you to choose channels and open the Trading Floor."
          icon={<RadioIcon />}
        />
      </div>

      <form action={advance} className="flex justify-end items-center pt-2">
        <button
          type="submit"
          className="rounded-md bg-[var(--tradex-orange-500)] hover:bg-[var(--tradex-orange-600)] text-white px-6 py-2.5 text-sm font-medium transition"
        >
          Connect Telegram →
        </button>
      </form>
    </div>
  );
}

function Card({
  number,
  accent,
  title,
  body,
  icon,
}: {
  number: number;
  accent: "info" | "brand" | "success";
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  const colors = {
    info: { bg: "bg-[var(--info)]/10", border: "border-[var(--info)]/30", icon: "text-[var(--info)]" },
    brand: {
      bg: "bg-[var(--tradex-orange-500)]/10",
      border: "border-[var(--tradex-orange-500)]/30",
      icon: "text-[var(--tradex-orange-500)]",
    },
    success: {
      bg: "bg-[var(--success)]/10",
      border: "border-[var(--success)]/30",
      icon: "text-[var(--success)]",
    },
  }[accent];
  return (
    <div
      className={`rounded-xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-3 hover:border-opacity-60 transition`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg bg-[var(--neutral-900)] flex items-center justify-center ${colors.icon}`}>
          {icon}
        </div>
        <span className="text-2xl font-semibold text-[var(--neutral-700)]">{number}</span>
      </div>
      <div>
        <div className="font-semibold text-[var(--neutral-100)]">{title}</div>
        <p className="text-xs text-[var(--neutral-400)] mt-1.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function RadioIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.93 19.07A10 10 0 0 1 4.93 4.93" />
      <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="2" x2="9" y2="4" />
      <line x1="15" y1="2" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="22" />
      <line x1="15" y1="20" x2="15" y2="22" />
      <line x1="20" y1="9" x2="22" y2="9" />
      <line x1="20" y1="14" x2="22" y2="14" />
      <line x1="2" y1="9" x2="4" y2="9" />
      <line x1="2" y1="14" x2="4" y2="14" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
