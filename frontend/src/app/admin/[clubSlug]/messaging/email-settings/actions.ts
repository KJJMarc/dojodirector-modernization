"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { updateAcademyEmailSettings } from "@/lib/academy-email.server";
import { clubAcademyEmailSettingsPath } from "@/lib/academy-email.shared";
import { clubAdminPath } from "@/lib/clubs.shared";

export async function saveAcademyEmailSettingsAction(formData: FormData) {
  const clubSlug = String(formData.get("clubSlug") ?? "").trim();
  const { club } = await requireAdminAccessForClubSlug(clubSlug);

  await updateAcademyEmailSettings({
    clubId: club.id,
    contactEmail: String(formData.get("contactEmail") ?? ""),
    replyToEmail: String(formData.get("replyToEmail") ?? ""),
    senderDisplayName: String(formData.get("senderDisplayName") ?? ""),
    emailEnabled: formData.get("emailEnabled") === "on",
  });

  revalidatePath(clubAdminPath(club.slug, "messaging"));
  revalidatePath(clubAcademyEmailSettingsPath(club.slug));
}
