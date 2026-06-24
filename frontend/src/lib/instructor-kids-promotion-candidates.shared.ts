import {
  isKidsPromotionCandidatesOnRegistersClub,
  filterKidsPromotionRegisterDateGroups,
  type KidsPromotionRegisterDateGroup,
  type KidsPromotionRegisterSession,
} from "@/lib/admin-kids-promotion-registers.shared";
import {
  parseAttendanceRegisterDateKey,
  resolveAttendanceScheduleFilter,
  type AttendanceScheduleFilter,
} from "@/lib/attendance-schedule";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";
import { addLondonCalendarDays, getLondonTodayDateKey } from "@/lib/london-datetime";

export function isInstructorKidsPromotionCandidatesClub(clubSlug: string) {
  return isKidsPromotionCandidatesOnRegistersClub(clubSlug);
}

export interface InstructorKidsPromotionCandidatesSearchParams {
  date?: string | string[];
  days?: string | string[];
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

export interface KidsPromotionCandidateSessionCard {
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
  session: KidsPromotionRegisterSession;
}

function normalizeSearchParam(value: string | string[] | undefined): string | undefined {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized?.trim() || undefined;
}

export function parseInstructorKidsPromotionCandidatesSearchParams(
  searchParams: InstructorKidsPromotionCandidatesSearchParams,
): { date?: string; days?: number } {
  const date = parseAttendanceRegisterDateKey(normalizeSearchParam(searchParams.date));
  const daysRaw = normalizeSearchParam(searchParams.days);
  const parsedDays = daysRaw ? Number(daysRaw) : undefined;
  const days =
    parsedDays !== undefined &&
    Number.isInteger(parsedDays) &&
    parsedDays >= 2 &&
    parsedDays <= 31
      ? parsedDays
      : undefined;

  return {
    ...(date ? { date } : {}),
    ...(days ? { days } : {}),
  };
}

export function resolveInstructorKidsPromotionScheduleFilter(
  searchParams: InstructorKidsPromotionCandidatesSearchParams,
): AttendanceScheduleFilter {
  const context = parseInstructorKidsPromotionCandidatesSearchParams(searchParams);
  return resolveAttendanceScheduleFilter(context);
}

export function instructorPortalKidsPromotionCandidatesPath(
  clubSlug: string,
  options?: { date?: string; days?: number },
): string {
  const base = `${instructorPortalClubPath(clubSlug)}/promotion-candidates`;

  if (!options?.date && !options?.days) {
    return base;
  }

  const params = new URLSearchParams();

  if (options.date) {
    params.set("date", options.date);
  }

  if (options.days) {
    params.set("days", String(options.days));
  }

  return `${base}?${params.toString()}`;
}

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

export function listKidsPromotionCandidateSessionCards(
  dateGroups: KidsPromotionRegisterDateGroup[],
  from = new Date(),
): KidsPromotionCandidateSessionCard[] {
  const orderedGroups = prioritizeTodayKidsPromotionRegisterDateGroups(
    filterKidsPromotionRegisterDateGroups(dateGroups, "candidates"),
    from,
  );
  const cards: KidsPromotionCandidateSessionCard[] = [];

  for (const group of orderedGroups) {
    for (const session of group.sessions) {
      cards.push({
        dateKey: group.dateKey,
        dateLabel: group.dateLabel,
        dayLabel: group.dayLabel,
        session,
      });
    }
  }

  return cards;
}

export function shouldExpandKidsPromotionSessionByDefault(
  dateKey: string,
  todayKey = getLondonTodayDateKey(),
): boolean {
  return dateKey === todayKey;
}

export function buildDefaultExpandedKidsPromotionSessionIds(
  cards: KidsPromotionCandidateSessionCard[],
  todayKey = getLondonTodayDateKey(),
): string[] {
  return cards
    .filter((card) => shouldExpandKidsPromotionSessionByDefault(card.dateKey, todayKey))
    .map((card) => card.session.id);
}

export function resolveKidsPromotionNavigationDateKey(
  selectedDate: string | undefined,
  todayKey = getLondonTodayDateKey(),
): string {
  return selectedDate ?? todayKey;
}

export function buildAdjacentKidsPromotionDatePath(
  clubSlug: string,
  currentDateKey: string,
  dayOffset: number,
): string {
  return instructorPortalKidsPromotionCandidatesPath(clubSlug, {
    date: addLondonCalendarDays(currentDateKey, dayOffset),
  });
}
