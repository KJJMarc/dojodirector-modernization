"use server";

import { revalidatePath } from "next/cache";
import { instructorPromoteJuniorPromotionCandidate } from "@/lib/instructor-kids-promotion-candidates.server";
import {
  instructorPortalKidsPromotionCandidatesPath,
  type InstructorPromoteJuniorCandidateResult,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";
import { revalidateStudentAdminPaths } from "@/lib/admin-revalidate.server";
import { clubKidsPromotionCandidatesOnRegistersPath } from "@/lib/admin-kids-promotion-registers.shared";

export async function promoteJuniorCandidateAction(
  formData: FormData,
): Promise<InstructorPromoteJuniorCandidateResult> {
  try {
    const clubSlug = String(formData.get("clubSlug") ?? "").trim();
    const userId = String(formData.get("userId") ?? "").trim();

    if (!clubSlug || !userId) {
      return {
        status: "error",
        message: "Missing promotion details. Please refresh and try again.",
      };
    }

    const { club } = await requireInstructorPortalPageContext(clubSlug);

    const result = await instructorPromoteJuniorPromotionCandidate({
      clubId: club.id,
      clubSlug: club.slug,
      userId,
    });

    revalidateStudentAdminPaths(club.slug, userId);
    revalidatePath(instructorPortalKidsPromotionCandidatesPath(club.slug));
    revalidatePath(clubKidsPromotionCandidatesOnRegistersPath(club.slug));

    return {
      status: "success",
      studentName: result.studentName,
      nextBeltLabel: result.nextBeltLabel,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to promote this student. Please try again.",
    };
  }
}
