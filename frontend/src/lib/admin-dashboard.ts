import { getTodayUtcRange } from "@/lib/attendance";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminDashboardStats {
  todaysSessions: number;
  bookedToday: number;
  presentToday: number;
  studentsTotal: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = getSupabaseServerClient();
  const { startIso, endIso } = getTodayUtcRange();

  const { data: todaysSessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id")
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .neq("status", "cancelled");

  if (sessionsError) {
    throw new Error(
      `Failed to load today's sessions: ${sessionsError.message}`,
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
        `Failed to count today's bookings: ${bookedResult.error.message}`,
      );
    }

    if (presentResult.error) {
      throw new Error(
        `Failed to count today's attendance: ${presentResult.error.message}`,
      );
    }

    bookedToday = bookedResult.count ?? 0;
    presentToday = presentResult.count ?? 0;
  }

  const { count: studentsTotal, error: usersError } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });

  if (usersError) {
    throw new Error(`Failed to count students: ${usersError.message}`);
  }

  return {
    todaysSessions: todaysSessionsCount,
    bookedToday,
    presentToday,
    studentsTotal: studentsTotal ?? 0,
  };
}
