import "server-only";

import { adminAwardBeltLevel } from "@/lib/admin-change-belt.server";
import { resolveEligibleJuniorPromotionAward } from "@/lib/admin-belt-promotion.server";
import { loadKidsPromotionRegisterSessionCandidates } from "@/lib/admin-kids-promotion-registers.server";
import { getTodayDateInputValue } from "@/lib/admin-belt-levels.shared";
import { isInstructorKidsPromotionCandidatesClub } from "@/lib/instructor-kids-promotion-candidates.shared";

export async function instructorPromoteJuniorPromotionCandidate(input: {
  clubId: string;
  clubSlug: string;
  userId: string;
}) {
  if (!isInstructorKidsPromotionCandidatesClub(input.clubSlug)) {
    throw new Error("Promotion candidates are only available for Kingston Jiu Jitsu Kids.");
  }

  const awardTarget = await resolveEligibleJuniorPromotionAward({
    clubId: input.clubId,
    userId: input.userId,
  });

  if (!awardTarget) {
    throw new Error("This student is not currently eligible for promotion.");
  }

  const awardResult = await adminAwardBeltLevel({
    userId: input.userId,
    beltLevelId: awardTarget.nextBeltLevelId,
    awardedAt: getTodayDateInputValue(),
    notes: "Promoted via instructor portal",
    clubId: input.clubId,
    clubSlug: input.clubSlug,
  });

  if (!awardResult.ok) {
    throw new Error(awardResult.message);
  }

  return {
    studentName: awardTarget.candidate.fullName,
    nextBeltLabel: awardTarget.candidate.assessment.nextBeltLabel,
  };
}

export async function loadInstructorKidsPromotionSessionCandidates(input: {
  clubId: string;
  clubSlug: string;
  sessionId: string;
}) {
  if (!isInstructorKidsPromotionCandidatesClub(input.clubSlug)) {
    throw new Error("Promotion candidates are only available for Kingston Jiu Jitsu Kids.");
  }

  return loadKidsPromotionRegisterSessionCandidates(
    input.clubId,
    input.clubSlug,
    input.sessionId,
  );
}
