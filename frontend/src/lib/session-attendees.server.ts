import "server-only";

import { ATTENDANCE_REGISTER_BOOKING_STATUSES } from "@/lib/attendance-register-booking.shared";
import type { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { getSupabaseServerClient } from "@/lib/supabase/server";

const SUPABASE_PAGE_SIZE = 1000;

export interface SessionAttendeeScheduleCountRow {
  class_session_id: string;
  booking_status: string | null;
  user_id: string | null;
  guest_booking_id: string | null;
}

type SessionAttendeesSupabaseClient =
  | ReturnType<typeof getSupabaseServerClient>
  | ReturnType<typeof getSupabaseAdminClient>;

/** Paginate through session_attendees — PostgREST defaults to 1000 rows per request. */
export async function fetchSessionAttendeesForScheduleCounts(
  supabase: SessionAttendeesSupabaseClient,
  sessionIds: string[],
): Promise<SessionAttendeeScheduleCountRow[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const rows: SessionAttendeeScheduleCountRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("session_attendees")
      .select("class_session_id, booking_status, user_id, guest_booking_id")
      .in("class_session_id", sessionIds)
      .in("booking_status", [...ATTENDANCE_REGISTER_BOOKING_STATUSES])
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load session bookings: ${error.message}`);
    }

    const page = (data ?? []) as SessionAttendeeScheduleCountRow[];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return rows;
}
