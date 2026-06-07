import "server-only";

import { getTodayUtcRange } from "@/lib/attendance";
import { countBjjProgrammeStudents } from "@/lib/admin-students.server";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
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
  const { startIso, endIso } = getTodayUtcRange();

  const { data: todaysSessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("club_id", clubId)
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
    const [bookedResult, presentResult] = await Promise.all([
      supabase
        .from("session_attendees")
        .select("id", { count: "exact", head: true })
        .in("class_session_id", sessionIds)
        .eq("booking_status", "booked"),
      supabase
        .from("session_attendees")
        .select("id", { count: "exact", head: true })
        .in("class_session_id", sessionIds)
        .eq("attendance_status", "present"),
    ]);

    if (bookedResult.error) {
      throw new Error(
        formatSupabaseError("Failed to count today's bookings", bookedResult.error),
      );
    }

    if (presentResult.error) {
      throw new Error(
        formatSupabaseError("Failed to count today's attendance", presentResult.error),
      );
    }

    bookedToday = bookedResult.count ?? 0;
    presentToday = presentResult.count ?? 0;
  }

  const studentsTotal = await countBjjProgrammeStudents(clubId, "active");

  return {
    todaysSessions: todaysSessionsCount,
    bookedToday,
    presentToday,
    studentsTotal,
  };
}
