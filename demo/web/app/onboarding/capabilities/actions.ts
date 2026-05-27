"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { advanceToTelegram } from "@/lib/services/onboarding";

export async function advance() {
  const userId = await requireUserId();
  const result = await advanceToTelegram(userId);
  redirect(result.nextPath);
}
