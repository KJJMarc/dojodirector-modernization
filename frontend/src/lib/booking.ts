import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeStudentBookingDetails,
  StudentBookingDetails,
} from "@/lib/booking-form";

interface ClassSessionRow {
  id: string;
  class_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
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

export interface BookableSession {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  bookedCount: number;
  spacesAvailable: number | null;
}

export interface BookableSessionGroup {
  dateKey: string;
  dateLabel: string;
  sessions: BookableSession[];
}

export function getBookingDateRange() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 14);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function formatBookingDate(startsAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(startsAt));
}

export function formatBookingTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function getSpacesAvailable(
  capacity: number | null,
  bookedCount: number,
): number | null {
  if (capacity === null) {
    return null;
  }

  return Math.max(0, capacity - bookedCount);
}

export function formatSpacesAvailable(spacesAvailable: number | null) {
  if (spacesAvailable === null) {
    return "Spaces available";
  }

  if (spacesAvailable === 0) {
    return "Full — join waitlist";
  }

  return `${spacesAvailable} space${spacesAvailable === 1 ? "" : "s"} available`;
}

export const LOCATION_TBC = "Location TBC";

export function formatSessionLocation(location: string | null | undefined) {
  const trimmed = location?.trim();
  return trimmed ? trimmed : LOCATION_TBC;
}

interface AttendanceRegisterLocationRow {
  class_session_id: string;
  location: string | null;
}

export async function getSessionLocationMap(
  sessionIds: string[],
): Promise<Map<string, string | null>> {
  const locationBySessionId = new Map<string, string | null>();

  if (sessionIds.length === 0) {
    return locationBySessionId;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("attendance_register_rows")
    .select("class_session_id, location")
    .in("class_session_id", sessionIds);

  if (error) {
    return locationBySessionId;
  }

  for (const row of (data ?? []) as AttendanceRegisterLocationRow[]) {
    if (!row.class_session_id || locationBySessionId.has(row.class_session_id)) {
      continue;
    }

    locationBySessionId.set(row.class_session_id, row.location ?? null);
  }

  return locationBySessionId;
}

export async function getSessionLocation(
  classSessionId: string,
): Promise<string | null> {
  const locationBySessionId = await getSessionLocationMap([classSessionId]);
  return locationBySessionId.get(classSessionId) ?? null;
}

export function groupSessionsByDate(
  sessions: BookableSession[],
): BookableSessionGroup[] {
  const groups = new Map<string, BookableSessionGroup>();

  for (const session of sessions) {
    const dateKey = new Date(session.startsAt).toISOString().slice(0, 10);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        dateLabel: formatBookingDate(session.startsAt),
        sessions: [],
      });
    }

    groups.get(dateKey)!.sessions.push(session);
  }

  return Array.from(groups.values());
}

function isBookedStatus(bookingStatus: string | null) {
  return bookingStatus === "booked";
}

export async function getUpcomingBookableSessions(): Promise<BookableSession[]> {
  const supabase = getSupabaseServerClient();
  const { startIso, endIso } = getBookingDateRange();

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id, class_id, starts_at, ends_at, capacity, status")
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (sessionsError) {
    throw new Error(`Failed to load class sessions: ${sessionsError.message}`);
  }

  const sessions = ((sessionRows ?? []) as ClassSessionRow[]).filter(
    (session) => session.status !== "cancelled",
  );

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);
  const classIds = Array.from(
    new Set(sessions.map((session) => session.class_id)),
  );

  const [classesResult, attendeesResult, locationBySessionId] = await Promise.all([
    supabase.from("classes").select("id, name").in("id", classIds),
    supabase
      .from("session_attendees")
      .select("id, class_session_id, booking_status")
      .in("class_session_id", sessionIds),
    getSessionLocationMap(sessionIds),
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

  const attendees = (attendeesResult.data ?? []) as SessionAttendeeRow[];
  const bookedCountBySession = new Map<string, number>();

  for (const attendee of attendees) {
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

    return {
      id: session.id,
      className: classNameById.get(session.class_id) ?? "Unnamed class",
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      location: locationBySessionId.get(session.id) ?? null,
      capacity: session.capacity,
      bookedCount,
      spacesAvailable: getSpacesAvailable(session.capacity, bookedCount),
    };
  });
}

export function validateStudentBookingDetails(details: StudentBookingDetails) {
  if (!details.firstName && !details.lastName) {
    throw new Error("Please enter your first and last name.");
  }

  if (!details.firstName) {
    throw new Error("Please enter your first name.");
  }

  if (!details.lastName) {
    throw new Error("Please enter your last name.");
  }

  if (!details.email || !details.email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
}

export interface StudentBookingSubmission extends StudentBookingDetails {
  classSessionId: string;
}

export function parseStudentBookingSubmission(
  input: StudentBookingSubmission,
): StudentBookingSubmission {
  return {
    classSessionId: String(input.classSessionId ?? "").trim(),
    ...normalizeStudentBookingDetails(
      String(input.firstName ?? ""),
      String(input.lastName ?? ""),
      String(input.email ?? ""),
    ),
  };
}
