import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { isValidStep, pathForStep } from "@/lib/services/onboarding";

const STEP_BY_PATH: Record<string, "capabilities" | "telegram"> = {
  "/onboarding/capabilities": "capabilities",
  "/onboarding/telegram": "telegram",
};

const STEP_INDEX: Record<string, number> = {
  capabilities: 1,
  telegram: 2,
};

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // If user has completed onboarding, bounce out
  if (user.onboardedAt && user.onboardingStep === "done") {
    redirect("/");
  }

  // Gate: prevent skipping ahead. Read pathname from request header (set by middleware).
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
  const requestedStep = Object.entries(STEP_BY_PATH).find(([p]) => pathname.endsWith(p))?.[1];
  const userStep =
    isValidStep(user.onboardingStep) ? user.onboardingStep : "capabilities";

  if (requestedStep && userStep !== "done") {
    const reqIdx = STEP_INDEX[requestedStep] ?? 1;
    const userIdxValue = STEP_INDEX[userStep] ?? 1;
    if (reqIdx > userIdxValue) {
      redirect(pathForStep(userStep));
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--neutral-950)]">
      <main className="flex-1 px-6 py-10">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
