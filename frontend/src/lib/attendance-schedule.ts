import { formatBookingDate } from "@/lib/booking";
import { getLondonDateRangeIso, getLondonTodayDateKey, LONDON_TIMEZONE } from "@/lib/london-datetime";
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
