import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface GuestBookingProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  booking_status: string;
}

export async function createSessionAttendeeForGuestBooking(input: {
  guestBookingId: string;
  sessionId: string;
  bookedAt?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const bookedAt = input.bookedAt ?? new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("session_attendees")
    .select("id")
    .eq("guest_booking_id", input.guestBookingId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to check guest register row: ${existingError.message}`,
    );
  }

  if (existing) {
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("session_attendees")
    .insert({
      class_session_id: input.sessionId,
      user_id: null,
      guest_booking_id: input.guestBookingId,
      booking_status: "booked",
      attendance_status: "not_marked",
      source: "guest_booking",
      booked_at: bookedAt,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to add guest to class register: ${error.message}`);
  }

  const attendeeId = (data as { id: string } | null)?.id;

  if (!attendeeId) {
    throw new Error("Unable to add guest to class register: missing attendee id.");
  }

  return attendeeId;
}

export async function cancelGuestBookingRegisterEntry(attendeeId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, guest_booking_id, booking_status, attendance_status, class_session_id")
    .eq("id", attendeeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load guest register row: ${error.message}`);
  }

  if (!data?.guest_booking_id) {
    return null;
  }

  const hasRecordedAttendance =
    data.attendance_status === "present" || data.attendance_status === "absent";

  const attendeeUpdate: {
    booking_status: "cancelled";
    updated_at: string;
    attendance_status?: "not_marked";
  } = {
    booking_status: "cancelled",
    updated_at: new Date().toISOString(),
  };

  if (!hasRecordedAttendance) {
    attendeeUpdate.attendance_status = "not_marked";
  }

  const { error: attendeeUpdateError } = await supabase
    .from("session_attendees")
    .update(attendeeUpdate)
    .eq("id", attendeeId);

  if (attendeeUpdateError) {
    throw new Error(
      `Unable to cancel guest register row: ${attendeeUpdateError.message}`,
    );
  }

  const { error: guestUpdateError } = await supabase
    .from("guest_bookings")
    .update({ booking_status: "cancelled" })
    .eq("id", data.guest_booking_id);

  if (guestUpdateError) {
    throw new Error(`Unable to cancel guest booking: ${guestUpdateError.message}`);
  }

  return {
    sessionId: data.class_session_id as string,
    guestBookingId: data.guest_booking_id as string,
  };
}

export async function loadGuestBookingProfilesById(
  guestBookingIds: string[],
): Promise<Map<string, GuestBookingProfileRow>> {
  if (guestBookingIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guest_bookings")
    .select("id, first_name, last_name, email, booking_status")
    .in("id", guestBookingIds);

  if (error) {
    throw new Error(`Unable to load guest booking profiles: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as GuestBookingProfileRow[]).map((row) => [row.id, row]),
  );
}
