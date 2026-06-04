import { formatBookingDate } from "@/lib/booking";
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

/** Start of today (UTC) through the next 8 weeks (exclusive end). */
export function getAttendanceScheduleDateRange() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 56);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function formatAttendanceMonthLabel(startsAt: string, externalId?: string | null) {
  const dateKey = resolveScheduleDateKey({ startsAt, externalId });
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
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
