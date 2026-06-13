"use server";

import { revalidatePath } from "next/cache";

import {
  clubProgrammeAdminPath,
  clubProgrammesAdminPath,
  PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE,
  parseProgrammeCreateFormData,
} from "@/lib/admin-programmes.shared";
import {
  createAdminProgramme,
  getProgrammesSchemaAvailable,
} from "@/lib/admin-programmes.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export interface CreateProgrammeActionResult {
  redirectTo?: string;
  error?: string;
}

export async function createProgrammeAction(
  formData: FormData,
): Promise<CreateProgrammeActionResult> {
  try {
    if (!(await getProgrammesSchemaAvailable())) {
      return { error: PROGRAMME_MANAGEMENT_UNAVAILABLE_MESSAGE };
    }

    const clubSlug = String(formData.get("clubSlug") ?? "").trim();
    const club = await requireClubBySlug(clubSlug);
    const parsed = parseProgrammeCreateFormData(formData);

    const programme = await createAdminProgramme({
      clubId: club.id,
      name: parsed.name,
      slug: parsed.slug,
      settings: parsed.settings,
      adminAreaEnabled: parsed.adminAreaEnabled,
    });

    revalidatePath(clubProgrammesAdminPath(club.slug));

    return {
      redirectTo: clubProgrammeAdminPath(club.slug, programme.slug),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to create programme.",
    };
  }
}
