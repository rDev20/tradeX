"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { signupUser } from "@/lib/services/auth";

export async function signup(formData: FormData) {
  const result = await signupUser({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    password: String(formData.get("password") ?? ""),
    passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
  });

  if (!result.ok) {
    if (result.capReached) redirect("/signup?cap=1");
    redirect(`/signup?error=${encodeURIComponent(result.error)}`);
  }

  await createSession(result.userId);
  redirect(result.redirect);
}
