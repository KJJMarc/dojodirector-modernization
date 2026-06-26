"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";
import { adminAwardBeltLevel } from "@/lib/admin-change-belt.server";
import { revalidateStudentAdminPaths } from "@/lib/admin-revalidate.server";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export type AwardBeltLevelActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function awardBeltLevelAction(
  formData: FormData,
): Promise<AwardBeltLevelActionResult> {
  const clubSlug = parseClubSlugFromForm(formData);
  const userId = String(formData.get("userId") ?? "");
  const beltLevelId = String(formData.get("beltLevelId") ?? "");
  const awardedAt = String(formData.get("awardedAt") ?? "");
  const notes = String(formData.get("notes") ?? "");

  try {
    if (!userId) {
      return { ok: false, message: "Missing student id." };
    }

    if (!beltLevelId) {
      return { ok: false, message: "Please select a belt level." };
    }

    if (!awardedAt) {
      return { ok: false, message: "Please choose an awarded date." };
    }

    const club = await requireClubBySlug(clubSlug);
    const result = await adminAwardBeltLevel({
      userId,
      beltLevelId,
      awardedAt,
      notes,
      clubId: club.id,
      clubSlug: club.slug,
    });

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    revalidateStudentAdminPaths(clubSlug, userId);
    redirect(clubAdminPath(clubSlug, `students/${userId}/profile`));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[awardBeltLevelAction] failed", {
      clubSlug,
      userId,
      beltLevelId,
      awardedAt,
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to award belt level. Please try again.",
    };
  }

  return { ok: true };
}
