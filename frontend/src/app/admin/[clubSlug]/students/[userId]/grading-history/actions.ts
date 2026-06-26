"use server";

import {
  adminDeleteGradeAward,
  adminUpdateGradeAward,
} from "@/lib/admin-grade-award.server";
import { revalidateStudentAdminPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export type UpdateGradeAwardActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type DeleteGradeAwardActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateGradeAwardAction(
  formData: FormData,
): Promise<UpdateGradeAwardActionResult> {
  const clubSlug = parseClubSlugFromForm(formData);
  const userId = String(formData.get("userId") ?? "");
  const awardId = String(formData.get("awardId") ?? "");
  const beltLevelId = String(formData.get("beltLevelId") ?? "");
  const awardedAt = String(formData.get("awardedAt") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!userId || !awardId || !beltLevelId || !awardedAt) {
    return { ok: false, message: "Missing required grading history fields." };
  }

  const club = await requireClubBySlug(clubSlug);
  const result = await adminUpdateGradeAward({
    awardId,
    clubId: club.id,
    clubSlug: club.slug,
    beltLevelId,
    awardedAt,
    notes,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateStudentAdminPaths(clubSlug, userId);
  return { ok: true };
}

export async function deleteGradeAwardAction(
  formData: FormData,
): Promise<DeleteGradeAwardActionResult> {
  const clubSlug = parseClubSlugFromForm(formData);
  const userId = String(formData.get("userId") ?? "");
  const awardId = String(formData.get("awardId") ?? "");

  if (!userId || !awardId) {
    return { ok: false, message: "Missing required grading history fields." };
  }

  const club = await requireClubBySlug(clubSlug);
  const result = await adminDeleteGradeAward({
    awardId,
    userId,
    clubId: club.id,
    clubSlug: club.slug,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateStudentAdminPaths(clubSlug, userId);
  return { ok: true };
}
