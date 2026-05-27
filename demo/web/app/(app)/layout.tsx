import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { PaperBanner } from "@/components/paper-banner";
import { TopBar } from "@/components/topbar";
import { isValidStep, pathForStep } from "@/lib/services/onboarding";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const pathname = (await headers()).get("x-pathname") ?? "/";

  if (user.role === "admin") {
    redirect("/admin");
  }

  if (pathname === "/" || !pathname.startsWith("/trading-floor")) {
    redirect("/trading-floor");
  }

  // Legacy onboarding gate for any older non-admin accounts still mid-flow.
  if (!user.onboardedAt) {
    const step = isValidStep(user.onboardingStep) ? user.onboardingStep : "capabilities";
    if (step !== "done") {
      redirect(pathForStep(step));
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--neutral-950)]">
      <PaperBanner />
      <TopBar displayName={user.fullName} email={user.email} />
      <div className="flex-1 flex">
        <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
