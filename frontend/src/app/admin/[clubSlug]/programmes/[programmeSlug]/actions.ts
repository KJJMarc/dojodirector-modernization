"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clubProgrammeAdminPath,
  clubProgrammesAdminPath,
  PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE,
  parseProgrammeFeatureSettings,
} from "@/lib/admin-programmes.shared";
import {
  getProgrammesSchemaAvailable,
  updateAdminProgrammeSettings,
} from "@/lib/admin-programmes.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function updateProgrammeSettingsAction(formData: FormData) {
  if (!(await getProgrammesSchemaAvailable())) {
    throw new Error(PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE);
  }

  const clubSlug = String(formData.get("clubSlug") ?? "").trim();
  const programmeSlug = String(formData.get("programmeSlug") ?? "").trim();
  const club = await requireClubBySlug(clubSlug);
  const name = String(formData.get("programmeName") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  const settings = parseProgrammeFeatureSettings(formData);

  const programme = await updateAdminProgrammeSettings({
    clubId: club.id,
    programmeSlug,
    name,
    settings,
    isActive,
  });

  revalidatePath(clubProgrammesAdminPath(club.slug));
  revalidatePath(clubProgrammeAdminPath(club.slug, programme.slug));
  redirect(clubProgrammeAdminPath(club.slug, programme.slug));
}
