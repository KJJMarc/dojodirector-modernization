"use server";

import {
  adminDeleteGradeAward,
  adminUpdateGradeAward,
} from "@/lib/admin-grade-award.server";
import { revalidateStudentAdminPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function updateGradeAwardAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const userId = String(formData.get("userId") ?? "");
  const awardId = String(formData.get("awardId") ?? "");
  const beltLevelId = String(formData.get("beltLevelId") ?? "");
  const awardedAt = String(formData.get("awardedAt") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!userId || !awardId || !beltLevelId || !awardedAt) {
    throw new Error("Missing required grading history fields.");
  }

  await adminUpdateGradeAward({
    awardId,
    clubId: club.id,
    beltLevelId,
    awardedAt,
    notes,
  });

  revalidateStudentAdminPaths(clubSlug, userId);
}

export async function deleteGradeAwardAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const userId = String(formData.get("userId") ?? "");
  const awardId = String(formData.get("awardId") ?? "");

  if (!userId || !awardId) {
    throw new Error("Missing required grading history fields.");
  }

  await adminDeleteGradeAward({
    awardId,
    userId,
    clubId: club.id,
  });

  revalidateStudentAdminPaths(clubSlug, userId);
}
