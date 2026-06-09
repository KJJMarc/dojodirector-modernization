import "server-only";

import { getLondonTodayRangeForAttendance } from "@/lib/attendance";
import {
  countUniqueActiveProgrammeStudentsForClub,
  loadActiveAdminAreaClassIdsForClub,
} from "@/lib/admin-programmes.server";
import { countsAsAttendanceRegisterAttendee } from "@/lib/attendance-register-booking.shared";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { fetchSessionAttendeesForScheduleCounts } from "@/lib/session-attendees.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AdminDashboardStats {
  todaysSessions: number;
  bookedToday: number;
  presentToday: number;
  studentsTotal: number;
}

function formatSupabaseError(context: string, error: { message?: string; code?: string; details?: string; hint?: string }) {
  const message = error.message?.trim();

  if (message) {
    return `${context}: ${message}`;
  }

  const details = [error.code, error.details, error.hint].filter(Boolean).join(" — ");

  return details ? `${context}: ${details}` : context;
}

export async function getAdminDashboardStats(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminDashboardStats> {
  const supabase = getSupabaseAdminClient();
  const { startIso, endIso } = getLondonTodayRangeForAttendance();
  const adminAreaClassIds = await loadActiveAdminAreaClassIdsForClub(clubId);
  const classIdList = Array.from(adminAreaClassIds);
  const studentsTotal = await countUniqueActiveProgrammeStudentsForClub(clubId);

  if (classIdList.length === 0) {
    return {
      todaysSessions: 0,
      bookedToday: 0,
      presentToday: 0,
      studentsTotal,
    };
  }

  const { data: todaysSessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("club_id", clubId)
    .in("class_id", classIdList)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .neq("status", "cancelled");

  if (sessionsError) {
    throw new Error(
      formatSupabaseError("Failed to load today's sessions", sessionsError),
    );
  }

  const sessionIds = (todaysSessions ?? []).map((session) => session.id);
  const todaysSessionsCount = sessionIds.length;

  let bookedToday = 0;
  let presentToday = 0;

  if (sessionIds.length > 0) {
    const [attendeeRows, presentResult] = await Promise.all([
      fetchSessionAttendeesForScheduleCounts(supabase, sessionIds),
      supabase
        .from("session_attendees")
        .select("id", { count: "exact", head: true })
        .in("class_session_id", sessionIds)
        .eq("attendance_status", "present"),
    ]);

    for (const attendee of attendeeRows) {
      if (countsAsAttendanceRegisterAttendee(attendee)) {
        bookedToday += 1;
      }
    }

    if (presentResult.error) {
      throw new Error(
        formatSupabaseError("Failed to count today's attendance", presentResult.error),
      );
    }

    presentToday = presentResult.count ?? 0;
  }

  return {
    todaysSessions: todaysSessionsCount,
    bookedToday,
    presentToday,
    studentsTotal,
  };
}
