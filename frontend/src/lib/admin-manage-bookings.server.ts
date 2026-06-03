import "server-only";

import { getAttendanceScheduleDateRange } from "@/lib/attendance-schedule";
import type { AdminCancelBookingsSchedulePageData } from "@/lib/admin-manage-bookings.shared";
import type { CancelBookingsSessionSummary } from "@/lib/admin-manage-bookings.shared";
import { getSpacesAvailable } from "@/lib/booking";
import {
  buildSessionDisplayLabels,
  formatScheduleDayLabel,
  resolveScheduleDateKey,
  resolveSessionLocationFromRow,
} from "@/lib/class-session-schedule";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ACTIVE_BOOKING_STATUSES = ["booked", "waitlisted", "walk_in"] as const;

interface UpcomingSessionRow {
  id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
  source: string | null;
  external_id: string | null;
  classes:
    | { name: string }
    | { name: string }[]
    | null;
}

interface SessionAttendeeCountRow {
  class_session_id: string;
  booking_status: string | null;
}

function getJoinedClassName(classes: UpcomingSessionRow["classes"]) {
  if (!classes) {
    return "Unnamed class";
  }

  const row = Array.isArray(classes) ? classes[0] : classes;
  return row?.name ?? "Unnamed class";
}

function isScheduledSession(status: string | null) {
  return status === "scheduled" || status === null;
}

function countsTowardCapacity(bookingStatus: string | null) {
  return bookingStatus === "booked" || bookingStatus === "walk_in";
}

function hasRecordedAttendance(attendanceStatus: string | null) {
  return attendanceStatus === "present" || attendanceStatus === "absent";
}

export async function getAdminCancelBookingsSchedulePageData(
  clubId: string,
): Promise<AdminCancelBookingsSchedulePageData> {
  const supabase = getSupabaseAdminClient();
  const { startIso, endIso } = getAttendanceScheduleDateRange();
  const nowIso = new Date().toISOString();
  const rangeStart = nowIso > startIso ? nowIso : startIso;

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("class_sessions")
    .select(
      "id, starts_at, ends_at, capacity, status, source, external_id, classes(name)",
    )
    .eq("club_id", clubId)
    .gte("starts_at", rangeStart)
    .lt("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (sessionsError) {
    throw new Error(`Unable to load upcoming sessions: ${sessionsError.message}`);
  }

  const sessions = ((sessionRows ?? []) as UpcomingSessionRow[]).filter((session) =>
    isScheduledSession(session.status),
  );

  if (sessions.length === 0) {
    return { sessions: [] };
  }

  const sessionIds = sessions.map((session) => session.id);

  const { data: attendeeRows, error: attendeesError } = await supabase
    .from("session_attendees")
    .select("class_session_id, booking_status")
    .in("class_session_id", sessionIds)
    .in("booking_status", [...ACTIVE_BOOKING_STATUSES]);

  if (attendeesError) {
    throw new Error(`Unable to load booking counts: ${attendeesError.message}`);
  }

  const bookedCountBySession = new Map<string, number>();

  for (const row of (attendeeRows ?? []) as SessionAttendeeCountRow[]) {
    if (!countsTowardCapacity(row.booking_status)) {
      continue;
    }

    bookedCountBySession.set(
      row.class_session_id,
      (bookedCountBySession.get(row.class_session_id) ?? 0) + 1,
    );
  }

  const mappedSessions: CancelBookingsSessionSummary[] = sessions.map((session) => {
    const bookedCount = bookedCountBySession.get(session.id) ?? 0;
    const location = resolveSessionLocationFromRow(session);
    const externalId = session.external_id ?? null;
    const displayLabels = buildSessionDisplayLabels({
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      externalId,
    });
    const scheduleDateKey = resolveScheduleDateKey({
      startsAt: session.starts_at,
      externalId,
    });

    return {
      id: session.id,
      className: getJoinedClassName(session.classes),
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      externalId,
      scheduleDateKey,
      dateLabel: displayLabels.dateLabel,
      timeLabel: displayLabels.timeLabel,
      dayLabel: formatScheduleDayLabel(session.starts_at),
      location,
      capacity: session.capacity,
      bookedCount,
      spacesAvailable: getSpacesAvailable(session.capacity, bookedCount),
      isCancelled: false,
    };
  });

  return { sessions: mappedSessions };
}

/** Cancels booking without removing attendance_records when attendance is already marked. */
export async function adminCancelSessionBookingPreserveAttendance(
  attendeeId: string,
) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, booking_status, attendance_status, class_session_id")
    .eq("id", attendeeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load booking: ${error.message}`);
  }

  if (!data) {
    throw new Error("Booking not found.");
  }

  if (data.booking_status === "cancelled") {
    return {
      sessionId: data.class_session_id as string,
    };
  }

  const updatePayload: {
    booking_status: "cancelled";
    updated_at: string;
    attendance_status?: "not_marked";
  } = {
    booking_status: "cancelled",
    updated_at: new Date().toISOString(),
  };

  if (!hasRecordedAttendance(data.attendance_status)) {
    updatePayload.attendance_status = "not_marked";
  }

  const { error: updateError } = await supabase
    .from("session_attendees")
    .update(updatePayload)
    .eq("id", attendeeId);

  if (updateError) {
    throw new Error(`Unable to cancel booking: ${updateError.message}`);
  }

  return {
    sessionId: data.class_session_id as string,
  };
}
