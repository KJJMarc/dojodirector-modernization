"use server";

import { requestPasswordResetEmail } from "@/lib/password-reset.server";

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");

  return requestPasswordResetEmail(email);
}
