"use server";

import {
  signInAdminAccessAndRedirect,
  signOutAdminAccess,
} from "@/lib/admin-auth.server";
import { adminAccessPath } from "@/lib/admin-auth.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { redirect } from "next/navigation";

export async function signInAdminAccessAction(formData: FormData) {
  await signInAdminAccessAndRedirect(formData);
}

export async function signOutAdminAccessAction(clubSlug: string) {
  const club = await requireClubBySlug(clubSlug);
  await signOutAdminAccess();
  redirect(adminAccessPath(club.slug));
}
