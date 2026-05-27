"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function setSourceChannelSelected(formData: FormData) {
  await requireAdminUser();
  const id = Number(formData.get("id"));
  const selected = String(formData.get("selected") ?? "false") === "true";
  if (!Number.isFinite(id)) return;

  await db.sourceChannel.update({
    where: { id },
    data: { selected },
  });
  revalidatePath("/admin/channels");
  revalidatePath("/admin");
}
