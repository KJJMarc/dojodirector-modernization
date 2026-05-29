"use server";

import { revalidatePath } from "next/cache";
import { getStudentFullName } from "@/lib/attendance";
import { resolveBookingStudent } from "@/lib/booking-eligibility";
import {
  formatBookingDate,
  formatBookingTime,
  parseStudentBookingSubmission,
  StudentBookingSubmission,
  validateStudentBookingDetails,
} from "@/lib/booking";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type BookingOutcome =
  | "confirmed"
  | "waitlisted"
  | "already_booked"
  | "already_waitlisted";

export interface BookingResult {
  outcome: BookingOutcome;
  className: string;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
  studentName: string;
  email: string;
}

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
    .from("attendance_register_rows")
    .select("location")
    .eq("class_session_id", classSessionId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.location ?? null;
}

function buildBookingResult(
  outcome: BookingOutcome,
  className: string,
  classSession: ClassSessionRow,
  location: string | null,
  studentName: string,
  email: string,
): BookingResult {
  const timeLabel = classSession.ends_at
    ? `${formatBookingTime(classSession.starts_at)} – ${formatBookingTime(classSession.ends_at)}`
    : formatBookingTime(classSession.starts_at);

  return {
    outcome,
    className,
    dateLabel: formatBookingDate(classSession.starts_at),
    timeLabel,
    location,
    studentName,
    email,
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

async function completeMemberBooking(
  submission: StudentBookingSubmission,
): Promise<BookingResult> {
  const { classSessionId, firstName, lastName, email } = submission;
  const details = { firstName, lastName, email };
  const studentName = getStudentFullName(firstName, lastName);

  const classSession = await getClassSession(classSessionId);

  if (classSession.status === "cancelled") {
    throw new Error("This class session is no longer available.");
  }

  const [className, location, bookingStudent] = await Promise.all([
    getClassName(classSession.class_id),
    getBookingSessionLocation(classSessionId),
    resolveBookingStudent(details, classSession.club_id),
  ]);

  const existingBooking = await getExistingMemberBooking(
    classSessionId,
    bookingStudent.userId,
  );

  if (existingBooking?.booking_status === "booked") {
    return buildBookingResult(
      "already_booked",
      className,
      classSession,
      location,
      studentName,
      email,
    );
  }

  if (existingBooking?.booking_status === "waitlisted") {
    return buildBookingResult(
      "already_waitlisted",
      className,
      classSession,
      location,
      studentName,
      email,
    );
  }

  const bookedCount = await getBookedCount(classSessionId);
  const hasSpacesAvailable =
    classSession.capacity === null || bookedCount < classSession.capacity;
  const bookingStatus = hasSpacesAvailable ? "booked" : "waitlisted";

  await createMemberSessionAttendee(
    classSessionId,
    bookingStudent.userId,
    bookingStatus,
    existingBooking,
  );

  if (bookingStatus === "booked") {
    // TODO: Send booking confirmation email to student.
    revalidatePath("/book");
    revalidatePath("/attendance");

    return buildBookingResult(
      "confirmed",
      className,
      classSession,
      location,
      studentName,
      email,
    );
  }

  // TODO: Send waiting list confirmation email to student.
  revalidatePath("/book");
  revalidatePath("/attendance");

  return buildBookingResult(
    "waitlisted",
    className,
    classSession,
    location,
    studentName,
    email,
  );
}

export async function submitStudentBooking(
  input: StudentBookingSubmission,
): Promise<BookingResult> {
  const submission = parseStudentBookingSubmission(input);
  validateStudentBookingDetails(submission);

  if (!submission.classSessionId) {
    throw new Error("Please choose a class to book.");
  }

  return completeMemberBooking(submission);
}
