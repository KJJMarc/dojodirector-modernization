"use server";

import { signInAdminAccessAndRedirect } from "@/lib/admin-auth.server";

export async function signInSuperAdminLoginAction(formData: FormData) {
  await signInAdminAccessAndRedirect(formData, "super_admin");
}
