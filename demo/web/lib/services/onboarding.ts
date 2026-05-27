// Pure onboarding state-machine logic. No Next.js, no DB writes outside helpers.

import { db } from "@/lib/db";

export const ONBOARDING_STEPS = ["capabilities", "telegram", "done"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_PATHS: Record<Exclude<OnboardingStep, "done">, string> = {
  capabilities: "/onboarding/capabilities",
  telegram: "/onboarding/telegram",
};

export function isValidStep(s: string): s is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(s);
}

export function nextStep(current: OnboardingStep): OnboardingStep {
  const i = ONBOARDING_STEPS.indexOf(current);
  return ONBOARDING_STEPS[Math.min(i + 1, ONBOARDING_STEPS.length - 1)];
}

export function pathForStep(step: OnboardingStep): string {
  if (step === "done") return "/";
  return STEP_PATHS[step];
}

export async function advanceToTelegram(userId: number): Promise<{ ok: true; nextPath: string }> {
  await db.user.update({
    where: { id: userId },
    data: { onboardingStep: "telegram" },
  });
  return { ok: true, nextPath: STEP_PATHS.telegram };
}

export async function markOnboardingDone(userId: number): Promise<{ ok: true; nextPath: string }> {
  await db.user.update({
    where: { id: userId },
    data: { onboardingStep: "done", onboardedAt: new Date() },
  });
  return { ok: true, nextPath: "/" };
}
