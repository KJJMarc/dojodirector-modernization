import "server-only";

import { revalidatePath } from "next/cache";
import {
  formatBookingDate,
  formatBookingTime,
} from "@/lib/booking";
import { resolveSessionLocationFromRow } from "@/lib/class-session-schedule";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type MemberBookingOutcome = "confirmed" | "waitlisted";

export interface MemberBookingResult {
  outcome: MemberBookingOutcome;
  className: string;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
}

const ALREADY_BOOKED_MESSAGE = "You are already booked onto this class.";
const ALREADY_WAITLISTED_MESSAGE =
  "You are already on the waiting list for this class.";

interface ClassSessionRow {
  id: string;
  class_id: string;
  club_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
}

interface SessionAttendeeRow {
  id: string;
  booking_status: string | null;
}

export interface BookClassSessionForUserInput {
  userId: string;
  classSessionId: string;
  clubId?: string;
}

async function getClassSession(classSessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, class_id, club_id, starts_at, ends_at, capacity, status")
    .eq("id", classSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Class session not found.");
  }

  return data as ClassSessionRow;
}

async function getClassName(classId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("name")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class details: ${error.message}`);
  }

  return data?.name ?? "Unnamed class";
}

async function getBookedCount(classSessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: true })
    .eq("class_session_id", classSessionId)
    .eq("booking_status", "booked");

  if (error) {
    throw new Error(`Unable to count bookings: ${error.message}`);
  }

  return count ?? 0;
}

async function getExistingMemberBooking(classSessionId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, booking_status")
    .eq("class_session_id", classSessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load booking: ${error.message}`);
  }

  return data as SessionAttendeeRow | null;
}

async function getBookingSessionLocation(
  classSessionId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("source, external_id")
    .eq("id", classSessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return resolveSessionLocationFromRow({
    source: data.source,
    external_id: data.external_id,
  });
}

function buildMemberBookingResult(
  outcome: MemberBookingOutcome,
  className: string,
  classSession: ClassSessionRow,
  location: string | null,
): MemberBookingResult {
  const timeLabel = classSession.ends_at
    ? `${formatBookingTime(classSession.starts_at)} – ${formatBookingTime(classSession.ends_at)}`
    : formatBookingTime(classSession.starts_at);

  return {
    outcome,
    className,
    dateLabel: formatBookingDate(classSession.starts_at),
    timeLabel,
    location,
  };
}

async function createMemberSessionAttendee(
  classSessionId: string,
  userId: string,
  bookingStatus: "booked" | "waitlisted",
  existingBooking: SessionAttendeeRow | null,
) {
  const supabase = getSupabaseAdminClient();

  if (existingBooking) {
    const { error: updateError } = await supabase
      .from("session_attendees")
      .update({
        booking_status: bookingStatus,
        attendance_status: "not_marked",
        source: "student_booking",
        booked_at: new Date().toISOString(),
      })
      .eq("id", existingBooking.id);

    if (updateError) {
      throw new Error(`Unable to complete booking: ${updateError.message}`);
    }

    return;
  }

  const { error } = await supabase.from("session_attendees").insert({
    class_session_id: classSessionId,
    user_id: userId,
    booking_status: bookingStatus,
    attendance_status: "not_marked",
    source: "student_booking",
    booked_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to complete booking: ${error.message}`);
  }
}

export function revalidatePathsAfterMemberBooking(portalUserId?: string) {
  revalidatePath("/book");
  revalidatePath("/attendance");

  if (portalUserId) {
    revalidatePath(`/student-portal/${portalUserId}`);
    revalidatePath(`/student-portal/${portalUserId}/book`);
    revalidatePath(`/student-portal/${portalUserId}/bookings`);
  }
}

export async function getClassSessionClubId(classSessionId: string) {
  const session = await getClassSession(classSessionId);
  return session.club_id;
}

export async function bookClassSessionForUser(
  input: BookClassSessionForUserInput,
): Promise<MemberBookingResult> {
  const userId = input.userId.trim();
  const classSessionId = input.classSessionId.trim();

  if (!userId) {
    throw new Error("Student account is required.");
  }

  if (!classSessionId) {
    throw new Error("Please choose a class to book.");
  }

  const classSession = await getClassSession(classSessionId);

  if (input.clubId && classSession.club_id !== input.clubId) {
    throw new Error("This class is not available for your club.");
  }

  if (classSession.status === "cancelled") {
    throw new Error("This class session is no longer available.");
  }

  const [className, location, existingBooking] = await Promise.all([
    getClassName(classSession.class_id),
    getBookingSessionLocation(classSessionId),
    getExistingMemberBooking(classSessionId, userId),
  ]);

  if (existingBooking?.booking_status === "booked") {
    throw new Error(ALREADY_BOOKED_MESSAGE);
  }

  if (existingBooking?.booking_status === "waitlisted") {
    throw new Error(ALREADY_WAITLISTED_MESSAGE);
  }

  const bookedCount = await getBookedCount(classSessionId);
  const hasSpacesAvailable =
    classSession.capacity === null || bookedCount < classSession.capacity;
  const bookingStatus = hasSpacesAvailable ? "booked" : "waitlisted";

  await createMemberSessionAttendee(
    classSessionId,
    userId,
    bookingStatus,
    existingBooking,
  );

  revalidatePathsAfterMemberBooking(userId);

  return buildMemberBookingResult(
    bookingStatus === "booked" ? "confirmed" : "waitlisted",
    className,
    classSession,
    location,
  );
}
