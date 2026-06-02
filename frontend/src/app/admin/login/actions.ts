"use server";

import { signInAdminAccessAndRedirect } from "@/lib/admin-auth.server";

export async function signInAcademyAdminLoginAction(formData: FormData) {
  await signInAdminAccessAndRedirect(formData, "academy_admin");
}
