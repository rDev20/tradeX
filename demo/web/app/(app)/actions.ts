"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroySession, requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setServiceStatus(status: "running" | "stopped") {
  const userId = await requireUserId();
  await db.userServiceStatus.upsert({
    where: { userId },
    create: { userId, status },
    update: { status },
  });
  await db.serviceEvent.create({
    data: { userId, event: status === "running" ? "START" : "STOP" },
  });
  revalidatePath("/", "layout");
}

export async function toggleFavorite(ticker: string) {
  const userId = await requireUserId();
  const existing = await db.favorite.findUnique({
    where: { userId_ticker: { userId, ticker } },
  });
  if (existing) {
    await db.favorite.delete({ where: { userId_ticker: { userId, ticker } } });
  } else {
    const count = await db.favorite.count({ where: { userId } });
    await db.favorite.create({ data: { userId, ticker, position: count } });
  }
  revalidatePath("/");
  revalidatePath("/market");
}

export async function evaluateChannel(formData: FormData) {
  const userId = await requireUserId();
  const id = Number(formData.get("id"));
  const budgetRaw = formData.get("budget");
  const budget = Math.max(1000, Number(budgetRaw ?? 100000));
  if (!Number.isFinite(id)) return;
  // Scoped update — user can only modify their own channels
  await db.channel.updateMany({
    where: { id, userId },
    data: { selected: true, budget },
  });
  revalidatePath("/channels");
  revalidatePath("/scorecard");
  revalidatePath("/");
  redirect("/");
}

export async function stopEvaluating(id: number) {
  const userId = await requireUserId();
  await db.channel.updateMany({
    where: { id, userId },
    data: { selected: false },
  });
  revalidatePath("/channels");
  revalidatePath("/scorecard");
  revalidatePath("/");
}

export async function updateChannelBudget(formData: FormData) {
  const userId = await requireUserId();
  const id = Number(formData.get("id"));
  const budget = Math.max(1000, Number(formData.get("budget") ?? 100000));
  if (!Number.isFinite(id)) return;
  await db.channel.updateMany({ where: { id, userId }, data: { budget } });
  revalidatePath("/channels");
  revalidatePath("/scorecard");
}
