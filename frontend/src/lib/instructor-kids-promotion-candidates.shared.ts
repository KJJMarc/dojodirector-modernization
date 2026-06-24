import {
  isKidsPromotionCandidatesOnRegistersClub,
  type KidsPromotionRegisterDateGroup,
} from "@/lib/admin-kids-promotion-registers.shared";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";
import { getLondonTodayDateKey } from "@/lib/london-datetime";

export function isInstructorKidsPromotionCandidatesClub(clubSlug: string) {
  return isKidsPromotionCandidatesOnRegistersClub(clubSlug);
}

export function instructorPortalKidsPromotionCandidatesPath(clubSlug: string) {
  return `${instructorPortalClubPath(clubSlug)}/promotion-candidates`;
}

export type InstructorPromoteJuniorCandidateResult =
  | {
      status: "success";
      studentName: string;
      nextBeltLabel: string;
    }
  | {
      status: "error";
      message: string;
    };

export function prioritizeTodayKidsPromotionRegisterDateGroups(
  dateGroups: KidsPromotionRegisterDateGroup[],
  from = new Date(),
): KidsPromotionRegisterDateGroup[] {
  const todayKey = getLondonTodayDateKey(from);
  const todayGroups = dateGroups.filter((group) => group.dateKey === todayKey);
  const otherGroups = dateGroups.filter((group) => group.dateKey !== todayKey);

  if (todayGroups.length === 0) {
    return dateGroups;
  }

  return [
    ...todayGroups.map((group) => ({
      ...group,
      dayLabel: "Today",
    })),
    ...otherGroups,
  ];
}
