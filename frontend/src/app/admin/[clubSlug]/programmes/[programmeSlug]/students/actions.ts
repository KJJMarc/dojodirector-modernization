"use server";

import { revalidatePath } from "next/cache";
import {
  removeStudentFromProgrammeMembership,
  requireClubProgrammeBySlug,
} from "@/lib/admin-programmes.server";
import {
  clubProgrammeStudentAreasPath,
  clubProgrammesAdminPath,
  programmeStudentsAdminPath,
} from "@/lib/admin-programmes.shared";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { requireClubBySlug } from "@/lib/clubs.server";
import { clubAdminPath } from "@/lib/clubs.shared";

function revalidateProgrammeStudentPaths(
  clubSlug: string,
  programmeSlug: string,
  userId?: string,
) {
  revalidatePath(programmeStudentsAdminPath(clubSlug, programmeSlug));
  revalidatePath(clubProgrammeStudentAreasPath(clubSlug));
  revalidatePath(clubProgrammesAdminPath(clubSlug));
  revalidatePath(clubAdminPath(clubSlug, `programmes/${programmeSlug}`));

  if (userId) {
    revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));
  }
}

export async function removeStudentFromProgrammeAction(formData: FormData) {
  const clubSlug = String(formData.get("clubSlug") ?? "").trim();
  const programmeSlug = String(formData.get("programmeSlug") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!clubSlug || !programmeSlug || !userId) {
    throw new Error("Missing required fields.");
  }

  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);
  const programme = await requireClubProgrammeBySlug(club.id, programmeSlug);

  await removeStudentFromProgrammeMembership({
    clubId: club.id,
    programmeId: programme.id,
    userId,
  });

  revalidateProgrammeStudentPaths(club.slug, programme.slug, userId);
}
