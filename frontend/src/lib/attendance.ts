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

function resolveAttendanceRegisterSortKey(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  const normalizedLastName = lastName?.trim() ?? "";
  const normalizedFirstName = firstName?.trim() ?? "";

  if (normalizedLastName) {
    return {
      primary: normalizedLastName,
      secondary: normalizedFirstName,
    };
  }

  const fullName = getStudentFullName(
    normalizedFirstName || null,
    null,
  );

  return {
    primary: fullName === "Unknown student" ? "" : fullName,
    secondary: "",
  };
}

/** Sort attendance register rows by surname, then first name, or full name when surname is unavailable. */
export function compareAttendanceRegisterNames(
  leftFirstName: string | null | undefined,
  leftLastName: string | null | undefined,
  rightFirstName: string | null | undefined,
  rightLastName: string | null | undefined,
) {
  const leftKey = resolveAttendanceRegisterSortKey(leftFirstName, leftLastName);
  const rightKey = resolveAttendanceRegisterSortKey(rightFirstName, rightLastName);
  const localeOptions = { sensitivity: "base" } as const;

  const primaryCompare = leftKey.primary.localeCompare(
    rightKey.primary,
    "en",
    localeOptions,
  );

  if (primaryCompare !== 0) {
    return primaryCompare;
  }

  return leftKey.secondary.localeCompare(rightKey.secondary, "en", localeOptions);
}

export function sortByAttendanceRegisterName<T>(
  items: T[],
  getNameFields: (item: T) => {
    firstName?: string | null;
    lastName?: string | null;
  },
) {
  return [...items].sort((left, right) => {
    const leftFields = getNameFields(left);
    const rightFields = getNameFields(right);

    return compareAttendanceRegisterNames(
      leftFields.firstName,
      leftFields.lastName,
      rightFields.firstName,
      rightFields.lastName,
    );
  });
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
