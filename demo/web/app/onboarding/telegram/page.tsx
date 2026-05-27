import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TelegramConnectFlow } from "./telegram-connect-flow";
import { OnboardingProgress } from "@/components/onboarding-progress";

export default async function TelegramOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <OnboardingProgress step={2} />
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[var(--neutral-500)]">
          Step 2 of 3
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Connect your Telegram</h1>
        <p className="text-sm text-[var(--neutral-400)] mt-2 max-w-xl">
          We'll send a 5-digit login code to your Telegram app. Your session lives server-side,
          encrypted at rest. Stage 3 happens on the dashboard: select channels and open the Trading Floor.
        </p>
      </div>

      <TelegramConnectFlow defaultPhone={user.phone} />

      <div className="text-xs text-[var(--neutral-500)] mt-6 leading-relaxed border-t border-[var(--neutral-800)] pt-4">
        <strong className="text-[var(--neutral-300)] uppercase tracking-widest text-[10px]">
          Security
        </strong>
        <br />
        We never see your Telegram password or private chats. Only the channels you select for
        evaluation are read. Disconnect any time.
      </div>
    </div>
  );
}
