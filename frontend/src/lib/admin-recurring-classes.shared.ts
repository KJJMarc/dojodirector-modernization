import { formatProgrammeTypeLabel, type ProgrammeType } from "@/lib/admin-programme-types";

export { formatProgrammeTypeLabel, type ProgrammeType };

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
