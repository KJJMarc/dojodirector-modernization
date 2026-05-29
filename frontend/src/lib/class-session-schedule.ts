import {
  formatBookingDate,
  formatBookingTime,
  getSpacesAvailable,
} from "@/lib/booking";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface ClassSessionRow {
  id: string;
  class_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
  source: string | null;
  external_id: string | null;
}

interface ClassRow {
  id: string;
  name: string;
}

interface SessionAttendeeRow {
  id: string;
  class_session_id: string;
  booking_status: string | null;
}

export interface ClassScheduleSession {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
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
}

export function formatScheduleDayLabel(startsAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
  }).format(new Date(startsAt));
}

export function formatScheduleTimeRange(startsAt: string, endsAt: string | null) {
  if (!endsAt) {
    return formatBookingTime(startsAt);
  }

  return `${formatBookingTime(startsAt)} – ${formatBookingTime(endsAt)}`;
}

export function formatScheduleCapacitySummary(session: ClassScheduleSession) {
  if (session.capacity === null) {
    return `${session.bookedCount} booked`;
  }

  return `${session.bookedCount} / ${session.capacity} booked`;
}

function isBookedStatus(bookingStatus: string | null) {
  return bookingStatus === "booked";
}

export function resolveSessionLocationFromRow(row: {
  source: string | null;
  external_id: string | null;
}): string | null {
  if (row.source === "kjj_timetable_seed" && row.external_id) {
    const match = row.external_id.match(
      /^kjj_timetable:[^:]+:\d{4}-\d{2}-\d{2}:\d{2}:\d{2}:(.+)$/,
    );

    if (match?.[1]) {
      return match[1].replace(/_/g, " ");
    }
  }

  return null;
}

/** Loads sessions from class_sessions (source of truth) with class names and booking counts. */
export async function loadClassScheduleSessions(
  options: LoadClassScheduleSessionsOptions,
): Promise<ClassScheduleSession[]> {
  const supabase = getSupabaseServerClient();
  const { startIso, endIso, includeCancelled = false } = options;

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id, class_id, starts_at, ends_at, capacity, status, source, external_id")
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (sessionsError) {
    throw new Error(`Failed to load class sessions: ${sessionsError.message}`);
  }

  const sessions = ((sessionRows ?? []) as ClassSessionRow[]).filter((session) =>
    includeCancelled ? true : session.status !== "cancelled",
  );

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);
  const classIds = Array.from(new Set(sessions.map((session) => session.class_id)));

  const [classesResult, attendeesResult] = await Promise.all([
    supabase.from("classes").select("id, name").in("id", classIds),
    supabase
      .from("session_attendees")
      .select("id, class_session_id, booking_status")
      .in("class_session_id", sessionIds),
  ]);

  if (classesResult.error) {
    throw new Error(`Failed to load classes: ${classesResult.error.message}`);
  }

  if (attendeesResult.error) {
    throw new Error(
      `Failed to load session bookings: ${attendeesResult.error.message}`,
    );
  }

  const classNameById = new Map(
    ((classesResult.data ?? []) as ClassRow[]).map((row) => [row.id, row.name]),
  );

  const bookedCountBySession = new Map<string, number>();

  for (const attendee of (attendeesResult.data ?? []) as SessionAttendeeRow[]) {
    if (!isBookedStatus(attendee.booking_status)) {
      continue;
    }

    bookedCountBySession.set(
      attendee.class_session_id,
      (bookedCountBySession.get(attendee.class_session_id) ?? 0) + 1,
    );
  }

  return sessions.map((session) => {
    const bookedCount = bookedCountBySession.get(session.id) ?? 0;
    const isCancelled = session.status === "cancelled";

    return {
      id: session.id,
      className: classNameById.get(session.class_id) ?? "Unnamed class",
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      location: resolveSessionLocationFromRow(session),
      capacity: session.capacity,
      bookedCount,
      spacesAvailable: getSpacesAvailable(session.capacity, bookedCount),
      status: session.status,
      isCancelled,
    };
  });
}

export function groupClassScheduleSessionsByDate(
  sessions: ClassScheduleSession[],
): ClassScheduleDateGroup[] {
  const groups = new Map<string, ClassScheduleDateGroup>();

  for (const session of sessions) {
    const dateKey = new Date(session.startsAt).toISOString().slice(0, 10);

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
