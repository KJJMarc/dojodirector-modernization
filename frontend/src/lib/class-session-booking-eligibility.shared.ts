import {
  resolveSessionLocationFromRow,
  resolveSessionSlotTimeFromRow,
} from "@/lib/class-session-schedule";

export interface SessionBookingEligibilityRow {
  class_id: string;
  starts_at: string;
  status: string | null;
  source: string | null;
  external_id: string | null;
  recurring_schedule_id?: string | null;
}

export interface ClassBookingEligibilityRow {
  is_active: boolean | null;
}

export interface RecurringScheduleBookingEligibilityRow {
  id: string;
  classId: string;
  dayOfWeek: number;
  startTime: string;
  location: string;
  isActive: boolean;
}

function getLondonDayOfWeek(startsAt: string) {
  const dayName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
  }).format(new Date(startsAt));

  switch (dayName) {
    case "Sun":
      return 0;
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return 0;
  }
}

function normalizeScheduleTime(time: string) {
  const [hours, minutes] = time.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function resolveMatchingRecurringScheduleId(
  session: SessionBookingEligibilityRow,
  schedules: RecurringScheduleBookingEligibilityRow[],
  options: { activeOnly: boolean },
): string | null {
  const dayOfWeek = getLondonDayOfWeek(session.starts_at);
  const startTime = normalizeScheduleTime(
    resolveSessionSlotTimeFromRow({
      starts_at: session.starts_at,
      external_id: session.external_id,
    }),
  );
  const location =
    resolveSessionLocationFromRow(session)?.trim().toLowerCase() ?? null;

  const candidates = schedules.filter(
    (schedule) =>
      schedule.isActive === options.activeOnly &&
      schedule.classId === session.class_id &&
      schedule.dayOfWeek === dayOfWeek &&
      normalizeScheduleTime(schedule.startTime) === startTime,
  );

  if (candidates.length === 0) {
    return null;
  }

  if (location) {
    const locationMatch = candidates.find(
      (schedule) => schedule.location.trim().toLowerCase() === location,
    );

    if (locationMatch) {
      return locationMatch.id;
    }
  }

  return candidates[0]?.id ?? null;
}

export function sessionMatchesInactiveRecurringSchedule(
  session: SessionBookingEligibilityRow,
  schedules: RecurringScheduleBookingEligibilityRow[],
) {
  if (session.recurring_schedule_id) {
    const linkedSchedule = schedules.find(
      (schedule) => schedule.id === session.recurring_schedule_id,
    );

    return linkedSchedule ? !linkedSchedule.isActive : false;
  }

  return (
    resolveMatchingRecurringScheduleId(session, schedules, { activeOnly: false }) !==
    null
  );
}

export function isScheduledSessionStatus(status: string | null) {
  return status === "scheduled" || status === null;
}

export function isSessionEligibleForActiveBooking(
  session: SessionBookingEligibilityRow,
  classRow: ClassBookingEligibilityRow | null | undefined,
  schedules: RecurringScheduleBookingEligibilityRow[],
) {
  if (!isScheduledSessionStatus(session.status)) {
    return false;
  }

  if (classRow?.is_active === false) {
    return false;
  }

  if (sessionMatchesInactiveRecurringSchedule(session, schedules)) {
    return false;
  }

  return true;
}

export function mapRecurringScheduleRowsForBookingEligibility(
  rows: Array<{
    id: string;
    class_id: string;
    day_of_week: number;
    start_time: string;
    location: string | null;
    is_active: boolean;
  }>,
): RecurringScheduleBookingEligibilityRow[] {
  return rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    location: row.location ?? "",
    isActive: row.is_active,
  }));
}

export function mapRecurringClassScheduleRowsForBookingEligibility(
  schedules: Array<{
    id: string;
    classId: string;
    dayOfWeek: number;
    startTime: string;
    location: string;
    isActive: boolean;
  }>,
): RecurringScheduleBookingEligibilityRow[] {
  return schedules.map((schedule) => ({
    id: schedule.id,
    classId: schedule.classId,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    location: schedule.location,
    isActive: schedule.isActive,
  }));
}
