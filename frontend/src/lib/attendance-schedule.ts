import { formatBookingDate } from "@/lib/booking";
import type { AttendanceRegisterNavContext } from "@/lib/attendance-register-navigation.shared";
import {
  addLondonCalendarDays,
  daysBetweenLondonDateKeys,
  getLondonDateRangeIso,
  getLondonTodayDateKey,
  londonLocalDateTimeToUtcIso,
  LONDON_TIMEZONE,
} from "@/lib/london-datetime";
import {
  ATTENDANCE_TIME_DISPLAY_FIX_VERSION,
  formatAttendanceSessionTimeRange,
  isAttendanceTimeDebugEnabled,
  resolveAttendanceSessionTimeSource,
} from "@/lib/attendance-time-display.shared";
import {
  ClassScheduleSession,
  formatScheduleCapacitySummary,
  formatScheduleDayLabel,
  resolveScheduleDateKey,
  type ClassScheduleDateGroup,
} from "@/lib/class-session-schedule";

export type AttendanceScheduleSession = ClassScheduleSession;
export type AttendanceScheduleDateGroup = ClassScheduleDateGroup;

export {
  ATTENDANCE_TIME_DISPLAY_FIX_VERSION,
  formatAttendanceSessionTimeRange,
  isAttendanceTimeDebugEnabled,
  resolveAttendanceSessionTimeSource,
  formatScheduleCapacitySummary as formatAttendanceCapacitySummary,
  formatScheduleDayLabel as formatAttendanceDayLabel,
};

export interface AttendanceScheduleMonthGroup {
  monthKey: string;
  monthLabel: string;
  dateGroups: AttendanceScheduleDateGroup[];
}

/** Start of today (Europe/London) through the next 8 weeks (exclusive end). */
export function getAttendanceScheduleDateRange(from = new Date()) {
  const { startIso, endIso } = getLondonDateRangeIso({ daysAhead: 56, from });

  return { startIso, endIso };
}

const ATTENDANCE_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AttendanceScheduleViewMode = "default" | "date-filter";

export interface AttendanceScheduleFilter {
  mode: AttendanceScheduleViewMode;
  dateKey?: string;
  rangeStartKey?: string;
  rangeEndKey?: string;
  days?: number;
}

export function isValidAttendanceDateKey(value: string) {
  if (!ATTENDANCE_DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function parseAttendanceRegisterDateKey(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();

  if (!normalized || !isValidAttendanceDateKey(normalized)) {
    return undefined;
  }

  return normalized;
}

export function resolveAttendanceScheduleFilter(
  context: Pick<AttendanceRegisterNavContext, "date" | "days"> | null | undefined,
  from = new Date(),
): AttendanceScheduleFilter {
  const todayKey = getLondonTodayDateKey(from);
  const dateKey = parseAttendanceRegisterDateKey(context?.date);
  const days = context?.days;

  if (!dateKey && !days) {
    return { mode: "default" };
  }

  const rangeEndKey = dateKey ?? todayKey;

  if (days && days > 1) {
    const rangeStartKey = addLondonCalendarDays(rangeEndKey, -(days - 1));

    return {
      mode: "date-filter",
      dateKey,
      rangeStartKey,
      rangeEndKey,
      days,
    };
  }

  return {
    mode: "date-filter",
    dateKey: rangeEndKey,
    rangeStartKey: rangeEndKey,
    rangeEndKey,
    days: 1,
  };
}

export function getAttendanceScheduleFilterDateRange(
  filter: AttendanceScheduleFilter,
  from = new Date(),
) {
  if (filter.mode === "default") {
    return getAttendanceScheduleDateRange(from);
  }

  const startKey = filter.rangeStartKey ?? filter.dateKey ?? getLondonTodayDateKey(from);
  const endKey = filter.rangeEndKey ?? filter.dateKey ?? startKey;
  const rangeEndExclusiveKey = addLondonCalendarDays(endKey, 1);

  return {
    startIso: londonLocalDateTimeToUtcIso(startKey, "00:00"),
    endIso: londonLocalDateTimeToUtcIso(rangeEndExclusiveKey, "00:00"),
    startDateKey: startKey,
    endDateKey: endKey,
  };
}

export function formatAttendanceRegisterDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: LONDON_TIMEZONE,
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function formatAttendanceScheduleFilterHeading(filter: AttendanceScheduleFilter) {
  if (filter.mode === "default") {
    return null;
  }

  const startKey = filter.rangeStartKey ?? filter.dateKey;
  const endKey = filter.rangeEndKey ?? filter.dateKey;

  if (!startKey || !endKey) {
    return null;
  }

  if (startKey === endKey) {
    return `Showing sessions for ${formatAttendanceRegisterDateLabel(startKey)}`;
  }

  const dayCount = daysBetweenLondonDateKeys(startKey, endKey) + 1;

  return `Showing sessions for the last ${dayCount} days (${formatAttendanceRegisterDateLabel(startKey)} – ${formatAttendanceRegisterDateLabel(endKey)})`;
}

export function formatAttendanceMonthLabel(startsAt: string, externalId?: string | null) {
  const dateKey = resolveScheduleDateKey({ startsAt, externalId });
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: LONDON_TIMEZONE,
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function groupAttendanceSessionsByMonth(
  sessions: AttendanceScheduleSession[],
): AttendanceScheduleMonthGroup[] {
  const months = new Map<string, AttendanceScheduleMonthGroup>();

  for (const session of sessions) {
    const dateKey = resolveScheduleDateKey({
      startsAt: session.startsAt,
      externalId: session.externalId,
    });
    const monthKey = dateKey.slice(0, 7);

    if (!months.has(monthKey)) {
      months.set(monthKey, {
        monthKey,
        monthLabel: formatAttendanceMonthLabel(
          session.startsAt,
          session.externalId,
        ),
        dateGroups: [],
      });
    }

    const monthGroup = months.get(monthKey)!;
    let dateGroup = monthGroup.dateGroups.find((group) => group.dateKey === dateKey);

    if (!dateGroup) {
      dateGroup = {
        dateKey,
        dateLabel: formatBookingDate(session.startsAt),
        dayLabel: formatScheduleDayLabel(session.startsAt),
        sessions: [],
      };
      monthGroup.dateGroups.push(dateGroup);
    }

    dateGroup.sessions.push(session);
  }

  return Array.from(months.values());
}

export function prioritizeTodayAttendanceMonthGroups(
  monthGroups: AttendanceScheduleMonthGroup[],
  from = new Date(),
): AttendanceScheduleMonthGroup[] {
  const todayKey = getLondonTodayDateKey(from);
  const todayGroups: AttendanceScheduleMonthGroup[] = [];
  const otherGroups: AttendanceScheduleMonthGroup[] = [];

  for (const monthGroup of monthGroups) {
    const todayDateGroups = monthGroup.dateGroups.filter(
      (group) => group.dateKey === todayKey,
    );
    const otherDateGroups = monthGroup.dateGroups.filter(
      (group) => group.dateKey !== todayKey,
    );

    if (todayDateGroups.length > 0) {
      todayGroups.push({
        ...monthGroup,
        monthLabel: "Today",
        dateGroups: todayDateGroups,
      });
    }

    if (otherDateGroups.length > 0) {
      otherGroups.push({
        ...monthGroup,
        dateGroups: otherDateGroups,
      });
    }
  }

  return [...todayGroups, ...otherGroups];
}
