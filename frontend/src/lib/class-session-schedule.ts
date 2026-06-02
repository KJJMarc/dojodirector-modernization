import {
  formatBookingDate,
} from "@/lib/booking";
import { utcIsoToLondonDate, utcIsoToLondonTime } from "@/lib/london-datetime";

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
}

export function formatScheduleDayLabel(startsAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "Europe/London",
  }).format(new Date(startsAt));
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

function hasExternalSessionSlotTime(externalId: string | null | undefined) {
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
