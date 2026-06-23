import type { PromotionCandidate } from "@/lib/admin-belt-promotion.shared";
import { isJuniorBeltCategory } from "@/lib/admin-belt-levels.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import { KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG } from "@/lib/clubs.shared";

export const KIDS_PROMOTION_CANDIDATES_ON_REGISTERS_CLUB_SLUG =
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG;

export type KidsPromotionRegistersFilter = "all" | "candidates";

export function clubKidsPromotionCandidatesOnRegistersPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "students/promotion-candidates-on-registers");
}

export function isKidsPromotionCandidatesOnRegistersClub(clubSlug: string) {
  return clubSlug.trim() === KIDS_PROMOTION_CANDIDATES_ON_REGISTERS_CLUB_SLUG;
}

export function parseKidsPromotionRegistersFilter(
  value: string | undefined,
): KidsPromotionRegistersFilter {
  return value === "candidates" ? "candidates" : "all";
}

export function filterJuniorPromotionCandidates(
  candidates: PromotionCandidate[],
): PromotionCandidate[] {
  return candidates.filter((candidate) =>
    isJuniorBeltCategory(candidate.currentBeltCategory),
  );
}

export interface KidsPromotionRegisterAttendee {
  attendeeId: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  attendanceStatus: string | null;
  isPromotionCandidate: boolean;
  promotionCandidate: PromotionCandidate | null;
}

export interface KidsPromotionRegisterSession {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  externalId: string | null;
  location: string | null;
  dateLabel: string;
  dayLabel: string;
  timeLabel: string;
  bookedCount: number;
  attendees: KidsPromotionRegisterAttendee[];
  promotionCandidateCount: number;
}

export interface KidsPromotionRegisterDateGroup {
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
  sessions: KidsPromotionRegisterSession[];
}

export interface KidsPromotionRegistersViewData {
  clubSlug: string;
  clubName: string;
  juniorPromotionCandidateCount: number;
  dateGroups: KidsPromotionRegisterDateGroup[];
}

export function filterKidsPromotionRegisterSessions(
  sessions: KidsPromotionRegisterSession[],
  filter: KidsPromotionRegistersFilter,
): KidsPromotionRegisterSession[] {
  if (filter === "all") {
    return sessions;
  }

  return sessions
    .map((session) => {
      const attendees = session.attendees.filter(
        (attendee) => attendee.isPromotionCandidate,
      );

      return {
        ...session,
        attendees,
        bookedCount: attendees.length,
        promotionCandidateCount: attendees.length,
      };
    })
    .filter((session) => session.attendees.length > 0);
}

export function filterKidsPromotionRegisterDateGroups(
  dateGroups: KidsPromotionRegisterDateGroup[],
  filter: KidsPromotionRegistersFilter,
): KidsPromotionRegisterDateGroup[] {
  return dateGroups
    .map((group) => ({
      ...group,
      sessions: filterKidsPromotionRegisterSessions(group.sessions, filter),
    }))
    .filter((group) => group.sessions.length > 0);
}
