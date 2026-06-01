import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { isBjjAttendanceCardManualSource, isLegacyImportAttendanceSource } from "@/lib/attendance-card-manual.shared";

export const ATTENDANCE_RECORDS_BJJ_SELECT =
  "attended_on, class_session_id, source, class_sessions(class_id, classes(programme_type))";

export const ATTENDANCE_RECORDS_BJJ_BULK_SELECT =
  "id, user_id, attended_on, class_session_id, source, class_sessions(class_id, classes(programme_type))";

export interface BjjAttendanceRecord {
  attended_on: string;
}

export interface BjjAttendanceRecordRow {
  attended_on: string;
  class_session_id: string | null;
  source?: string | null;
  programme_type?: string | null;
  class_sessions:
    | {
        classes: { programme_type: string } | { programme_type: string }[] | null;
      }
    | {
        classes: { programme_type: string } | { programme_type: string }[] | null;
      }[]
    | null;
}

const NON_BJJ_PROGRAMME_TYPES = new Set(["muay_thai", "strength_conditioning"]);

export interface BjjAttendanceSummary {
  lifetimeBjjAttendanceCount: number;
  attendanceSinceCurrentLevel: number;
  lastAttendanceDate: string | null;
  bjjRecords: BjjAttendanceRecord[];
}

/**
 * Session-linked rows use classes.programme_type. Session-less rows count as BJJ when
 * marked on the BJJ attendance card (or legacy imports without a session).
 */
export function isBjjAttendanceByProgrammeType(
  classSessionId: string | null,
  programmeType: string | null | undefined,
  source?: string | null,
): boolean {
  if (!classSessionId) {
    if (programmeType && NON_BJJ_PROGRAMME_TYPES.has(programmeType)) {
      return false;
    }

    if (programmeType === "bjj") {
      return true;
    }

    if (isBjjAttendanceCardManualSource(source)) {
      return true;
    }

    if (isLegacyImportAttendanceSource(source)) {
      return true;
    }

    // Legacy session-less BJJ check-ins and seed data (no linked class session).
    return true;
  }

  return programmeType === "bjj";
}

export function getProgrammeTypeFromJoinedSession(
  classSessions:
    | {
        classes: { programme_type: string } | { programme_type: string }[] | null;
      }
    | {
        classes: { programme_type: string } | { programme_type: string }[] | null;
      }[]
    | null,
): string | null {
  if (!classSessions) {
    return null;
  }

  const session = Array.isArray(classSessions)
    ? (classSessions[0] ?? null)
    : classSessions;
  const classes = session?.classes;

  if (!classes) {
    return null;
  }

  const classRow = Array.isArray(classes) ? (classes[0] ?? null) : classes;
  return classRow?.programme_type ?? null;
}

export function isBjjAttendanceRecordWithJoinedSession(
  record: BjjAttendanceRecordRow,
): boolean {
  const programmeType =
    record.programme_type?.trim() ||
    getProgrammeTypeFromJoinedSession(record.class_sessions);

  return isBjjAttendanceByProgrammeType(
    record.class_session_id,
    programmeType,
    record.source,
  );
}

/** Unique calendar days with BJJ attendance — same counting as buildYearlyGrid totalAttendance. */
export function countUniqueBjjAttendanceDays(
  records: BjjAttendanceRecord[],
): number {
  const attendedDays = new Set<string>();

  for (const record of records) {
    const attendedOn = normalizeToDateKey(record.attended_on);

    if (attendedOn) {
      attendedDays.add(attendedOn);
    }
  }

  return attendedDays.size;
}

export function countUniqueBjjAttendanceDaysSince(
  records: BjjAttendanceRecord[],
  sinceDate: string | null,
): number {
  const sinceKey = normalizeToDateKey(sinceDate);

  if (!sinceKey) {
    return countUniqueBjjAttendanceDays(records);
  }

  const attendedDays = new Set<string>();

  for (const record of records) {
    const attendedOn = normalizeToDateKey(record.attended_on);

    if (attendedOn && attendedOn >= sinceKey) {
      attendedDays.add(attendedOn);
    }
  }

  return attendedDays.size;
}

export function getLatestBjjAttendanceDate(
  records: BjjAttendanceRecord[],
): string | null {
  let latest: string | null = null;

  for (const record of records) {
    const attendedOn = normalizeToDateKey(record.attended_on);

    if (attendedOn && (!latest || attendedOn > latest)) {
      latest = attendedOn;
    }
  }

  return latest;
}

export function buildBjjAttendanceSummary(
  bjjRecords: BjjAttendanceRecord[],
  currentLevelAwardedAt: string | null,
): BjjAttendanceSummary {
  const awardedAtKey = normalizeToDateKey(currentLevelAwardedAt);

  return {
    lifetimeBjjAttendanceCount: countUniqueBjjAttendanceDays(bjjRecords),
    attendanceSinceCurrentLevel: countUniqueBjjAttendanceDaysSince(
      bjjRecords,
      awardedAtKey,
    ),
    lastAttendanceDate: getLatestBjjAttendanceDate(bjjRecords),
    bjjRecords,
  };
}

export interface BeltLevelStripeInfo {
  stripe_count: number | null;
}

export function countBjjAttendanceRecordsAfterAward(
  bjjRecords: BjjAttendanceRecord[],
  awardedAt: string | null,
): number {
  const sinceKey = normalizeToDateKey(awardedAt);

  if (!sinceKey) {
    return bjjRecords.length;
  }

  return bjjRecords.filter((record) => {
    const attendedOn = normalizeToDateKey(record.attended_on);
    return attendedOn ? attendedOn >= sinceKey : false;
  }).length;
}
