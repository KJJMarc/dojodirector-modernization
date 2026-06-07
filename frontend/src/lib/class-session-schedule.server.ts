import "server-only";

import { cache } from "react";
import {
  countsAsAttendanceRegisterStudent,
} from "@/lib/attendance-register-booking.shared";
import {
  getSpacesAvailable,
} from "@/lib/booking";
import {
  isSessionEligibleForActiveBooking,
  mapRecurringScheduleRowsForBookingEligibility,
} from "@/lib/class-session-booking-eligibility.shared";
import type {
  ClassScheduleSession,
  LoadClassScheduleSessionsOptions,
} from "@/lib/class-session-schedule";
import { resolveSessionLocationFromRow } from "@/lib/class-session-schedule";
import {
  ensureClubRecurringFutureSessions,
} from "@/lib/ensure-club-recurring-sessions.server";
import { fetchSessionAttendeesForScheduleCounts } from "@/lib/session-attendees.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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
  recurring_schedule_id: string | null;
}

interface ClassRow {
  id: string;
  name: string;
  is_active: boolean | null;
  club_id: string | null;
  programme_id: string | null;
}

/** Loads sessions from class_sessions (source of truth) with class names and booking counts. */
export async function loadClassScheduleSessions(
  options: LoadClassScheduleSessionsOptions,
): Promise<ClassScheduleSession[]> {
  const {
    startIso,
    endIso,
    includeCancelled = false,
    activeClassesOnly = false,
    clubId,
    ensureRecurringSessions = true,
  } = options;
  if (clubId && ensureRecurringSessions) {
    await ensureClubRecurringFutureSessions(clubId);
  }

  const useAdminClient = activeClassesOnly && Boolean(clubId);
  const supabase = useAdminClient
    ? getSupabaseAdminClient()
    : getSupabaseServerClient();

  let sessionQuery = supabase
    .from("class_sessions")
    .select(
      "id, class_id, starts_at, ends_at, capacity, status, source, external_id, recurring_schedule_id",
    )
    .gte("starts_at", startIso)
    .lt("starts_at", endIso);

  if (clubId) {
    sessionQuery = sessionQuery.eq("club_id", clubId);
  }

  const { data: sessionRows, error: sessionsError } = await sessionQuery.order(
    "starts_at",
    { ascending: true },
  );

  if (sessionsError) {
    throw new Error(`Failed to load class sessions: ${sessionsError.message}`);
  }

  const sessions = ((sessionRows ?? []) as ClassSessionRow[]).filter((session) =>
    includeCancelled ? true : session.status === "scheduled" || session.status === null,
  );

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);
  const classIds = Array.from(new Set(sessions.map((session) => session.class_id)));
  const shouldFilterInactiveRecurringSchedules = activeClassesOnly && Boolean(clubId);

  const [classesResult, attendeeRows, recurringSchedulesResult] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, is_active, club_id, programme_id")
      .in("id", classIds),
    fetchSessionAttendeesForScheduleCounts(supabase, sessionIds),
    shouldFilterInactiveRecurringSchedules
      ? supabase
          .from("recurring_class_schedules")
          .select("id, class_id, day_of_week, start_time, location, is_active")
          .eq("club_id", clubId!)
          .in("class_id", classIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (classesResult.error) {
    throw new Error(`Failed to load classes: ${classesResult.error.message}`);
  }

  if (recurringSchedulesResult.error) {
    throw new Error(
      `Failed to load recurring classes: ${recurringSchedulesResult.error.message}`,
    );
  }

  const classRows = (classesResult.data ?? []) as ClassRow[];
  const classNameById = new Map(classRows.map((row) => [row.id, row.name]));
  const programmeIdByClassId = new Map(
    classRows.map((row) => [row.id, row.programme_id]),
  );
  const activeClassIds = new Set(
    classRows.filter((row) => row.is_active !== false).map((row) => row.id),
  );

  const clubClassIds = clubId
    ? new Set(
        classRows.filter((row) => row.club_id === clubId).map((row) => row.id),
      )
    : null;

  const recurringSchedulesForBooking = shouldFilterInactiveRecurringSchedules
    ? mapRecurringScheduleRowsForBookingEligibility(
        (recurringSchedulesResult.data ?? []) as Array<{
          id: string;
          class_id: string;
          day_of_week: number;
          start_time: string;
          location: string | null;
          is_active: boolean;
        }>,
      )
    : [];

  const classRowById = new Map(classRows.map((row) => [row.id, row]));

  const visibleSessions = sessions.filter((session) => {
    if (activeClassesOnly && !activeClassIds.has(session.class_id)) {
      return false;
    }

    if (clubClassIds && !clubClassIds.has(session.class_id)) {
      return false;
    }

    if (activeClassesOnly && clubId) {
      return isSessionEligibleForActiveBooking(
        session,
        classRowById.get(session.class_id),
        recurringSchedulesForBooking,
      );
    }

    return true;
  });

  const bookedCountBySession = new Map<string, number>();

  for (const attendee of attendeeRows) {
    if (!countsAsAttendanceRegisterStudent(attendee)) {
      continue;
    }

    bookedCountBySession.set(
      attendee.class_session_id,
      (bookedCountBySession.get(attendee.class_session_id) ?? 0) + 1,
    );
  }

  return visibleSessions.map((session) => {
    const bookedCount = bookedCountBySession.get(session.id) ?? 0;
    const isCancelled = session.status === "cancelled";

    return {
      id: session.id,
      classId: session.class_id,
      className: classNameById.get(session.class_id) ?? "Unnamed class",
      programmeId: programmeIdByClassId.get(session.class_id) ?? null,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      externalId: session.external_id,
      location: resolveSessionLocationFromRow(session),
      capacity: session.capacity,
      bookedCount,
      spacesAvailable: getSpacesAvailable(session.capacity, bookedCount),
      status: session.status,
      isCancelled,
    };
  });
}
