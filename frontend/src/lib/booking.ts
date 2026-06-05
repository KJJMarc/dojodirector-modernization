import {
  ClassScheduleSession,
  groupClassScheduleSessionsByDate,
  type ClassScheduleDateGroup,
} from "@/lib/class-session-schedule";
import {
  normalizeStudentBookingDetails,
  StudentBookingDetails,
} from "@/lib/booking-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSessionLocationFromRow } from "@/lib/class-session-schedule";
import {
  getLondonDateRangeIso,
  LONDON_TIMEZONE,
  utcIsoToLondonTime,
} from "@/lib/london-datetime";

export type BookableSession = ClassScheduleSession;

export type BookableSessionGroup = ClassScheduleDateGroup;

/** Next 14 London calendar days of bookable sessions (from start of today in Europe/London). */
export function getBookingDateRange(from = new Date()) {
  const { startIso, endIso } = getLondonDateRangeIso({ daysAhead: 14, from });

  return { startIso, endIso };
}

export function formatBookingDate(startsAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: LONDON_TIMEZONE,
  }).format(new Date(startsAt));
}

export function formatBookingTime(iso: string) {
  return utcIsoToLondonTime(iso);
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
    return "Full";
  }

  return `${spacesAvailable} space${spacesAvailable === 1 ? "" : "s"} available`;
}

export const LOCATION_TBC = "Location TBC";

export function formatSessionLocation(location: string | null | undefined) {
  const trimmed = location?.trim();
  return trimmed ? trimmed : LOCATION_TBC;
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
    .from("class_sessions")
    .select("id, source, external_id")
    .in("id", sessionIds);

  if (error) {
    return locationBySessionId;
  }

  for (const row of data ?? []) {
    locationBySessionId.set(
      row.id,
      resolveSessionLocationFromRow({
        source: row.source,
        external_id: row.external_id,
      }),
    );
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
  return groupClassScheduleSessionsByDate(sessions);
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
