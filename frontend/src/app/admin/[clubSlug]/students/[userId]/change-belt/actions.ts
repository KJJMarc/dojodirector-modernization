"use server";

import { redirect } from "next/navigation";
import { adminAwardBeltLevel } from "@/lib/admin-change-belt.server";
import { revalidateStudentAdminPaths } from "@/lib/admin-revalidate.server";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function awardBeltLevelAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const userId = String(formData.get("userId") ?? "");
  const beltLevelId = String(formData.get("beltLevelId") ?? "");
  const awardedAt = String(formData.get("awardedAt") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!userId) {
    throw new Error("Missing student id.");
  }

  if (!beltLevelId) {
    throw new Error("Please select a belt level.");
  }

  if (!awardedAt) {
    throw new Error("Please choose an awarded date.");
  }

  await adminAwardBeltLevel({
    userId,
    beltLevelId,
    awardedAt,
    notes,
    clubId: club.id,
  });

  revalidateStudentAdminPaths(clubSlug, userId);
  redirect(clubAdminPath(clubSlug, `students/${userId}/profile`));
}
