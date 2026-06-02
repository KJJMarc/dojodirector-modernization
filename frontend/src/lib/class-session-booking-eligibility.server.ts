import "server-only";

import {
  isSessionEligibleForActiveBooking,
  mapRecurringClassScheduleRowsForBookingEligibility,
  type ClassBookingEligibilityRow,
  type SessionBookingEligibilityRow,
} from "@/lib/class-session-booking-eligibility.shared";
import { getRecurringClassSchedules } from "@/lib/admin-recurring-classes.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const SESSION_NOT_BOOKABLE_MESSAGE =
  "This class session is no longer available for booking.";

interface ClassSessionBookingGuardRow extends SessionBookingEligibilityRow {
  id: string;
  club_id: string;
}

async function loadClassSessionForBookingGuard(
  classSessionId: string,
): Promise<ClassSessionBookingGuardRow> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, club_id, starts_at, status, source, external_id, recurring_schedule_id",
    )
    .eq("id", classSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Class session not found.");
  }

  return data as ClassSessionBookingGuardRow;
}

async function loadClassBookingEligibilityRow(
  classId: string,
): Promise<ClassBookingEligibilityRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("is_active")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class: ${error.message}`);
  }

  return (data as ClassBookingEligibilityRow | null) ?? null;
}

export async function assertSessionIsBookableForClub(
  classSessionId: string,
  clubId: string,
) {
  const session = await loadClassSessionForBookingGuard(classSessionId);

  if (session.club_id !== clubId) {
    throw new Error("This class is not available for booking at this club.");
  }

  const [classRow, recurringSchedules] = await Promise.all([
    loadClassBookingEligibilityRow(session.class_id),
    getRecurringClassSchedules(clubId),
  ]);

  if (
    !isSessionEligibleForActiveBooking(
      session,
      classRow,
      mapRecurringClassScheduleRowsForBookingEligibility(recurringSchedules),
    )
  ) {
    throw new Error(SESSION_NOT_BOOKABLE_MESSAGE);
  }

  return session;
}

export { SESSION_NOT_BOOKABLE_MESSAGE };
