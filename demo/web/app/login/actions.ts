"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { loginUser } from "@/lib/services/auth";

export async function login(formData: FormData) {
  const result = await loginUser({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    redirect("/login?error=1");
  }

  await createSession(result.userId);
  redirect(result.redirect);
}
