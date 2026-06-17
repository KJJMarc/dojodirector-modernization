import {
  PROGRAMME_TYPES,
  formatProgrammeTypeLabel,
  type ProgrammeType,
} from "@/lib/admin-programme-types";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
} from "@/lib/clubs.shared";
import { STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES } from "@/lib/admin-programmes.shared";

export { formatProgrammeTypeLabel, type ProgrammeType };

export interface RecurringClassProgrammeOption {
  programmeId: string | null;
  programmeType: ProgrammeType;
  label: string;
}

export interface RecurringClassProgrammeRow {
  id: string;
  name: string;
  programmeType: string;
  isActive: boolean;
}

function isKnownRecurringClassProgrammeType(
  value: string,
): value is ProgrammeType {
  return (PROGRAMME_TYPES as readonly string[]).includes(value);
}

/** Build recurring-class programme options from active academy programme rows. */
export function buildRecurringClassProgrammeOptionsFromRows(
  rows: readonly RecurringClassProgrammeRow[],
): RecurringClassProgrammeOption[] {
  const seenTypes = new Set<string>();
  const options: RecurringClassProgrammeOption[] = [];

  for (const row of rows) {
    if (!row.isActive) {
      continue;
    }

    const programmeType = row.programmeType.trim().toLowerCase();

    if (!programmeType || seenTypes.has(programmeType)) {
      continue;
    }

    if (!isKnownRecurringClassProgrammeType(programmeType)) {
      continue;
    }

    seenTypes.add(programmeType);
    options.push({
      programmeId: row.id,
      programmeType,
      label: formatProgrammeTypeLabel(programmeType),
    });
  }

  return options;
}

/** Legacy fallback when programme rows are unavailable for an academy. */
export function buildFallbackRecurringClassProgrammeOptions(
  clubSlug: string,
): RecurringClassProgrammeOption[] {
  const normalizedClubSlug = clubSlug.trim().toLowerCase();
  const programmeTypes =
    normalizedClubSlug === BAHAMAS_JIU_JITSU_CLUB_SLUG
      ? (["bjj"] as const)
      : STUDENT_PORTAL_ACCESS_PROGRAMME_TYPES;

  return programmeTypes.map((programmeType) => ({
    programmeId: null,
    programmeType,
    label: formatProgrammeTypeLabel(programmeType),
  }));
}

export function isRecurringClassProgrammeTypeAllowed(
  programmeType: string,
  options: readonly RecurringClassProgrammeOption[],
) {
  const normalizedType = programmeType.trim().toLowerCase();

  return options.some((option) => option.programmeType === normalizedType);
}

/** Keep edit forms working when a legacy class uses a programme type no longer enabled. */
export function ensureRecurringClassProgrammeOptionPresent(
  options: readonly RecurringClassProgrammeOption[],
  programmeType?: ProgrammeType,
): RecurringClassProgrammeOption[] {
  if (!programmeType || isRecurringClassProgrammeTypeAllowed(programmeType, options)) {
    return [...options];
  }

  return [
    ...options,
    {
      programmeId: null,
      programmeType,
      label: formatProgrammeTypeLabel(programmeType),
    },
  ];
}

export function resolveDefaultRecurringClassProgrammeType(
  options: readonly RecurringClassProgrammeOption[],
  preferredType?: ProgrammeType,
) {
  if (
    preferredType &&
    isRecurringClassProgrammeTypeAllowed(preferredType, options)
  ) {
    return preferredType;
  }

  return options[0]?.programmeType ?? "bjj";
}

/** How far ahead recurring class sessions are generated (52 weeks). */
export const RECURRING_CLASS_SESSION_DAYS_AHEAD = 364;

export const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export interface RecurringClassScheduleRow {
  id: string;
  clubId: string;
  classId: string;
  className: string;
  programmeType: ProgrammeType;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string;
  isActive: boolean;
}

export interface RecurringClassDeleteStatus {
  canDelete: boolean;
  attendanceRecordCount: number;
  futureSessionCount: number;
  message: string;
}

export interface RecurringSessionCapacitySyncResult {
  matchedCount: number;
  updatedCount: number;
  skippedAttendanceCount: number;
  skippedCancelledCount: number;
}

export function formatRecurringSessionCapacitySyncSummary(
  result: RecurringSessionCapacitySyncResult,
) {
  if (result.matchedCount === 0) {
    return "Class saved. Future sessions will use the updated details when generated.";
  }

  const parts = [
    `${result.updatedCount} future session${result.updatedCount === 1 ? "" : "s"} updated`,
  ];

  if (result.skippedAttendanceCount > 0) {
    parts.push(
      `${result.skippedAttendanceCount} skipped (attendance recorded)`,
    );
  }

  if (result.skippedCancelledCount > 0) {
    parts.push(`${result.skippedCancelledCount} skipped (cancelled)`);
  }

  return `Class saved. ${parts.join(" · ")}`;
}

export function formatDayOfWeekLabel(dayOfWeek: number) {
  return (
    DAY_OF_WEEK_OPTIONS.find((option) => option.value === dayOfWeek)?.label ??
    `Day ${dayOfWeek}`
  );
}

export function formatScheduleTimeLabel(timeValue: string) {
  const [hours, minutes] = timeValue.split(":");
  return `${hours}:${minutes}`;
}

export function formatScheduleTimeLabelSafe(timeValue: string | null | undefined) {
  if (!timeValue || !timeValue.includes(":")) {
    return "—";
  }

  return formatScheduleTimeLabel(timeValue);
}

/** Monday-first day order: Mon=1 … Sat=6, Sun=7 (not PostgreSQL Sun=0 first). */
export function getMondayFirstDayOrder(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

export function compareRecurringClassSchedules(
  left: Pick<RecurringClassScheduleRow, "dayOfWeek" | "startTime" | "className">,
  right: Pick<RecurringClassScheduleRow, "dayOfWeek" | "startTime" | "className">,
) {
  const dayCompare =
    getMondayFirstDayOrder(left.dayOfWeek) - getMondayFirstDayOrder(right.dayOfWeek);

  if (dayCompare !== 0) {
    return dayCompare;
  }

  const timeCompare = left.startTime.localeCompare(right.startTime);

  if (timeCompare !== 0) {
    return timeCompare;
  }

  return left.className.localeCompare(right.className, "en", {
    sensitivity: "base",
  });
}

export function sortRecurringClassSchedules<T extends RecurringClassScheduleRow>(
  schedules: T[],
): T[] {
  return [...schedules].sort(compareRecurringClassSchedules);
}
