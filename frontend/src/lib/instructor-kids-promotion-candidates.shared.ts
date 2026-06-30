import {
  isKidsPromotionCandidatesOnRegistersClub,
  type KidsPromotionRegisterAttendee,
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

export type LoadInstructorKidsPromotionSessionResult =
  | {
      status: "success";
      attendees: KidsPromotionRegisterAttendee[];
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
  from = new Date(),
): AttendanceScheduleFilter {
  const context = parseInstructorKidsPromotionCandidatesSearchParams(searchParams);

  if (!context.date && !context.days) {
    const todayKey = getLondonTodayDateKey(from);

    return {
      mode: "date-filter",
      dateKey: todayKey,
      rangeStartKey: todayKey,
      rangeEndKey: todayKey,
      days: 1,
    };
  }

  return resolveAttendanceScheduleFilter(context, from);
}

/** Canonical YYYY-MM-DD for the instructor promotion candidates day view. */
export function resolveInstructorKidsPromotionSelectedDateKey(
  searchParams: InstructorKidsPromotionCandidatesSearchParams,
  from = new Date(),
): string {
  const filter = resolveInstructorKidsPromotionScheduleFilter(searchParams, from);
  return (
    filter.rangeStartKey ??
    filter.dateKey ??
    getLondonTodayDateKey(from)
  );
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
  const orderedGroups = prioritizeTodayKidsPromotionRegisterDateGroups(dateGroups, from);
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
  viewingDateKey = getLondonTodayDateKey(),
): boolean {
  return dateKey === viewingDateKey;
}

export function buildDefaultExpandedKidsPromotionSessionIds(
  cards: KidsPromotionCandidateSessionCard[],
  viewingDateKey = getLondonTodayDateKey(),
): string[] {
  return cards
    .filter((card) =>
      shouldExpandKidsPromotionSessionByDefault(card.dateKey, viewingDateKey),
    )
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
