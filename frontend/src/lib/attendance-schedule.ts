import { formatBookingDate } from "@/lib/booking";
import {
  ClassScheduleSession,
  formatScheduleCapacitySummary,
  formatScheduleDayLabel,
  formatScheduleTimeRange,
  loadClassScheduleSessions,
  type ClassScheduleDateGroup,
} from "@/lib/class-session-schedule";

export type AttendanceScheduleSession = ClassScheduleSession;
export type AttendanceScheduleDateGroup = ClassScheduleDateGroup;

export {
  formatScheduleCapacitySummary as formatAttendanceCapacitySummary,
  formatScheduleDayLabel as formatAttendanceDayLabel,
  formatScheduleTimeRange as formatAttendanceTimeRange,
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

export function formatAttendanceMonthLabel(startsAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(startsAt));
}

export async function getAttendanceScheduleSessions(): Promise<AttendanceScheduleSession[]> {
  const { startIso, endIso } = getAttendanceScheduleDateRange();

  return loadClassScheduleSessions({
    startIso,
    endIso,
    includeCancelled: true,
  });
}

export function groupAttendanceSessionsByMonth(
  sessions: AttendanceScheduleSession[],
): AttendanceScheduleMonthGroup[] {
  const months = new Map<string, AttendanceScheduleMonthGroup>();

  for (const session of sessions) {
    const monthKey = new Date(session.startsAt).toISOString().slice(0, 7);

    if (!months.has(monthKey)) {
      months.set(monthKey, {
        monthKey,
        monthLabel: formatAttendanceMonthLabel(session.startsAt),
        dateGroups: [],
      });
    }

    const monthGroup = months.get(monthKey)!;
    const dateKey = new Date(session.startsAt).toISOString().slice(0, 10);
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
