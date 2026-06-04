import { utcIsoToLondonTime } from "@/lib/london-datetime";
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

export function getTodayUtcRange() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Start of today (UTC) through the next 7 calendar days (exclusive end). MVP window. */
export function getAttendanceRegisterDateRange() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 8);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function sortSessionsByTime(sessions: ClassSession[]) {
  return [...sessions].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
