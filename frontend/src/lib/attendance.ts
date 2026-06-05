import {
  getLondonDateRangeIso,
  getLondonTodayRange,
  utcIsoToLondonTime,
} from "@/lib/london-datetime";
import { ClassSession } from "@/types/database";

export function getStudentFullName(
  firstName: string | null,
  lastName: string | null,
) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : "Unknown student";
}

export function formatClassTime(startsAt: string) {
  return utcIsoToLondonTime(startsAt);
}

/** London calendar today [00:00, tomorrow 00:00) as UTC instants. */
export function getLondonTodayRangeForAttendance(from = new Date()) {
  return getLondonTodayRange(from);
}

/** @deprecated Use getLondonTodayRangeForAttendance — kept for admin dashboard import. */
export function getTodayUtcRange(from = new Date()) {
  return getLondonTodayRange(from);
}

/** Start of today (Europe/London) through the next 7 calendar days (exclusive end). */
export function getAttendanceRegisterDateRange(from = new Date()) {
  const { startIso, endIso } = getLondonDateRangeIso({ daysAhead: 8, from });

  return { startIso, endIso };
}

export function sortSessionsByTime(sessions: ClassSession[]) {
  return [...sessions].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
