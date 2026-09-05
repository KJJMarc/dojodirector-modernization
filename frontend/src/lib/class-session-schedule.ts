import {
  formatBookingDate,
} from "@/lib/booking";
import {
  encodeLocationForExternalId,
  londonLocalDateTimeToUtcIso,
  normalizeLondonClockTime,
  utcIsoToLondonDate,
  utcIsoToLondonDayOfWeek,
  utcIsoToLondonTime,
} from "@/lib/london-datetime";

export interface ClassScheduleSession {
  id: string;
  classId: string;
  className: string;
  programmeId: string | null;
  startsAt: string;
  endsAt: string | null;
  externalId: string | null;
  location: string | null;
  capacity: number | null;
  bookedCount: number;
  spacesAvailable: number | null;
  status: string | null;
  isCancelled: boolean;
}

export interface ClassScheduleDateGroup {
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
  sessions: ClassScheduleSession[];
}

export interface LoadClassScheduleSessionsOptions {
  startIso: string;
  endIso: string;
  includeCancelled?: boolean;
  activeClassesOnly?: boolean;
  /** When set, only sessions for classes belonging to this club are returned. */
  clubId?: string;
  /**
   * When false, skip best-effort recurring horizon fill (read-only list views).
   * Defaults to true for admin and public booking paths.
   */
  ensureRecurringSessions?: boolean;
}

export function isValidScheduleStartsAt(
  startsAt: string | null | undefined,
): startsAt is string {
  if (!startsAt) {
    return false;
  }

  return Number.isFinite(new Date(startsAt).getTime());
}

export function formatScheduleDayLabel(startsAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "Europe/London",
  }).format(new Date(startsAt));
}

export function formatScheduleDayLabelSafe(startsAt: string | null | undefined) {
  if (!isValidScheduleStartsAt(startsAt)) {
    return null;
  }

  return formatScheduleDayLabel(startsAt);
}

function normalizeTimeLabel(time: string) {
  const [hours, minutes] = time.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function addDurationToTimeLabel(startTime: string, durationMs: number) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + Math.round(durationMs / 60_000);
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

export function hasExternalSessionSlotTime(externalId: string | null | undefined) {
  if (!externalId) {
    return false;
  }

  return /^(?:kjj_timetable|kids_timetable|admin_recurring|admin_one_off):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}/.test(
    externalId,
  );
}

/** Display class times in UK local time, preferring timetable slot time from external_id when present. */
export function formatSessionTimeRangeForDisplay(input: {
  startsAt: string;
  endsAt: string | null;
  externalId?: string | null;
}) {
  if (hasExternalSessionSlotTime(input.externalId)) {
    const startLabel = normalizeTimeLabel(
      resolveSessionSlotTimeFromRow({
        starts_at: input.startsAt,
        external_id: input.externalId ?? null,
      }),
    );

    if (!input.endsAt) {
      return startLabel;
    }

    const durationMs =
      new Date(input.endsAt).getTime() - new Date(input.startsAt).getTime();

    return `${startLabel} – ${addDurationToTimeLabel(startLabel, durationMs)}`;
  }

  const startLabel = utcIsoToLondonTime(input.startsAt);

  if (!input.endsAt) {
    return startLabel;
  }

  return `${startLabel} – ${utcIsoToLondonTime(input.endsAt)}`;
}

export function formatScheduleTimeRange(
  startsAt: string,
  endsAt: string | null,
  externalId?: string | null,
) {
  return formatSessionTimeRangeForDisplay({ startsAt, endsAt, externalId });
}

/** Class date label aligned with booking portal (timetable external_id when present). */
/** Stable YYYY-MM-DD key for grouping sessions (timetable date when present). */
export function resolveScheduleDateKey(input: {
  startsAt: string;
  externalId?: string | null;
}) {
  if (hasExternalSessionSlotTime(input.externalId)) {
    const dateMatch = input.externalId?.match(/:(\d{4}-\d{2}-\d{2}):/);

    if (dateMatch?.[1]) {
      return dateMatch[1];
    }
  }

  return utcIsoToLondonDate(input.startsAt);
}

export function formatSessionDateLabelForDisplay(input: {
  startsAt: string;
  externalId?: string | null;
}) {
  if (hasExternalSessionSlotTime(input.externalId)) {
    const dateMatch = input.externalId?.match(/:(\d{4}-\d{2}-\d{2}):/);

    if (dateMatch?.[1]) {
      return formatBookingDate(
        londonLocalDateTimeToUtcIso(dateMatch[1], "12:00"),
      );
    }
  }

  return formatBookingDate(input.startsAt);
}

/** Date and time labels used consistently across portal, public booking, and messages. */
export function buildSessionDisplayLabels(input: {
  startsAt: string;
  endsAt: string | null;
  externalId?: string | null;
}) {
  return {
    dateLabel: formatSessionDateLabelForDisplay(input),
    timeLabel: formatSessionTimeRangeForDisplay(input),
  };
}

export function formatScheduleCapacitySummary(
  session: Pick<ClassScheduleSession, "capacity" | "bookedCount">,
) {
  if (session.capacity === null) {
    return `${session.bookedCount} booked`;
  }

  return `${session.bookedCount} / ${session.capacity} booked`;
}

export function resolveSessionLocationFromRow(row: {
  source: string | null;
  external_id: string | null;
}): string | null {
  if (
    (row.source === "kjj_timetable_seed" ||
      row.source === "kids_timetable_seed" ||
      row.source === "admin_recurring" ||
      row.source === "admin_one_off") &&
    row.external_id
  ) {
    const match = row.external_id.match(
      /^(?:kjj_timetable|kids_timetable|admin_recurring|admin_one_off):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}(?::\d{2})?:(.+)$/,
    );

    if (match?.[1]) {
      return match[1].replace(/_/g, " ");
    }
  }

  return null;
}

/**
 * Rewrite the venue suffix on a timetable/admin session external_id.
 * Returns the original value when the id shape is not recognised.
 */
export function rewriteSessionExternalIdLocation(
  externalId: string | null,
  location: string,
): string | null {
  if (!externalId) {
    return null;
  }

  const match = externalId.match(
    /^((?:kjj_timetable|kids_timetable|admin_recurring|admin_one_off):[^:]+:\d{4}-\d{2}-\d{2}:\d{1,2}:\d{2}(?::\d{2})?):(.+)$/,
  );

  if (!match?.[1]) {
    return externalId;
  }

  return `${match[1]}:${encodeLocationForExternalId(location)}`;
}

/** Timetable slot time from external_id when present; falls back to London wall time. */
export function resolveSessionSlotTimeFromRow(row: {
  starts_at: string;
  external_id: string | null;
}): string {
  if (row.external_id) {
    const match = row.external_id.match(
      /^(?:kjj_timetable|kids_timetable|admin_recurring|admin_one_off):[^:]+:\d{4}-\d{2}-\d{2}:(\d{1,2}:\d{2})/,
    );

    if (match?.[1]) {
      return match[1];
    }
  }

  return utcIsoToLondonTime(row.starts_at);
}

/** Timetable slot day/time for matching recurring_class_schedules (prefer external_id over starts_at). */
export function resolveRecurringScheduleSlotFromSessionRow(row: {
  starts_at: string;
  external_id: string | null;
}): { dayOfWeek: number; startTime: string } {
  if (row.external_id) {
    const slotMatch = row.external_id.match(
      /^(?:kjj_timetable|kids_timetable|admin_recurring):[^:]+:(\d{4}-\d{2}-\d{2}):(\d{1,2}:\d{2})/,
    );

    if (slotMatch?.[1] && slotMatch?.[2]) {
      return {
        dayOfWeek: utcIsoToLondonDayOfWeek(
          londonLocalDateTimeToUtcIso(slotMatch[1], "12:00"),
        ),
        startTime: normalizeLondonClockTime(slotMatch[2]),
      };
    }
  }

  return {
    dayOfWeek: utcIsoToLondonDayOfWeek(row.starts_at),
    startTime: normalizeLondonClockTime(utcIsoToLondonTime(row.starts_at)),
  };
}

function normalizeVenueLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

export interface RecurringScheduleSessionMatchRow {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  location: string | null;
  is_active?: boolean;
}

function findMatchingRecurringScheduleId(
  session: {
    class_id: string;
    starts_at: string;
    external_id: string | null;
    recurring_schedule_id: string | null;
    source?: string | null;
  },
  schedules: RecurringScheduleSessionMatchRow[],
  options: { activeOnly: boolean; requireSameClass: boolean },
): string | null {
  for (const schedule of schedules) {
    if (options.activeOnly && schedule.is_active === false) {
      continue;
    }

    if (options.requireSameClass && schedule.class_id !== session.class_id) {
      continue;
    }

    if (
      sessionBelongsToRecurringScheduleRow(session, {
        scheduleId: schedule.id,
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time,
        location: schedule.location,
      })
    ) {
      return schedule.id;
    }
  }

  return null;
}

/** Prefer explicit FK; otherwise match by class, day, time, and location (same rules as admin instructors). */
export function resolveEffectiveRecurringScheduleId(
  session: {
    class_id: string;
    starts_at: string;
    external_id: string | null;
    recurring_schedule_id: string | null;
    source?: string | null;
  },
  schedules: RecurringScheduleSessionMatchRow[],
  options?: { activeOnly?: boolean },
): string | null {
  if (session.recurring_schedule_id) {
    return session.recurring_schedule_id;
  }

  const activeOnly = options?.activeOnly ?? false;
  const sameClassMatch = findMatchingRecurringScheduleId(session, schedules, {
    activeOnly,
    requireSameClass: true,
  });

  if (sameClassMatch) {
    return sameClassMatch;
  }

  const classHasSchedules = schedules.some(
    (schedule) => schedule.class_id === session.class_id,
  );

  if (!classHasSchedules) {
    return findMatchingRecurringScheduleId(session, schedules, {
      activeOnly,
      requireSameClass: false,
    });
  }

  return null;
}

export function sessionBelongsToRecurringScheduleRow(
  session: {
    starts_at: string;
    external_id: string | null;
    recurring_schedule_id: string | null;
    source?: string | null;
  },
  schedule: {
    scheduleId: string;
    dayOfWeek: number;
    startTime: string;
    location?: string | null;
  },
) {
  if (session.recurring_schedule_id === schedule.scheduleId) {
    return true;
  }

  if (session.external_id?.startsWith(`admin_recurring:${schedule.scheduleId}:`)) {
    return true;
  }

  const slot = resolveRecurringScheduleSlotFromSessionRow(session);
  const scheduleTime = normalizeLondonClockTime(schedule.startTime);

  if (slot.dayOfWeek !== schedule.dayOfWeek || slot.startTime !== scheduleTime) {
    return false;
  }

  const scheduleLocation = schedule.location?.trim();
  if (!scheduleLocation) {
    return true;
  }

  const sessionLocation = resolveSessionLocationFromRow({
    source: session.source ?? null,
    external_id: session.external_id,
  });

  if (!sessionLocation) {
    return true;
  }

  return (
    normalizeVenueLabel(sessionLocation) === normalizeVenueLabel(scheduleLocation)
  );
}

export function groupClassScheduleSessionsByDate(
  sessions: ClassScheduleSession[],
): ClassScheduleDateGroup[] {
  const groups = new Map<string, ClassScheduleDateGroup>();

  for (const session of sessions) {
    const dateKey = utcIsoToLondonDate(session.startsAt);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        dateLabel: formatBookingDate(session.startsAt),
        dayLabel: formatScheduleDayLabel(session.startsAt),
        sessions: [],
      });
    }

    groups.get(dateKey)!.sessions.push(session);
  }

  return Array.from(groups.values());
}
