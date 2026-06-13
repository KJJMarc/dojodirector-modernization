import "server-only";

import { assertStudentCanBookClassProgramme } from "@/lib/admin-programmes.server";
import { getBookingStudentOptions } from "@/lib/admin-session-bookings.server";
import { applySessionAttendeeAttendanceStatus } from "@/lib/attendance-marking.server";
import type { AttendanceKioskCheckInResult, AttendanceKioskStudentOption } from "@/lib/attendance-kiosk.shared";
import { getStudentFullName, compareAttendanceRegisterNames } from "@/lib/attendance";
import { getAttendanceSessionDetails } from "@/lib/attendance-session";
import {
  formatAttendanceSessionTimeRange,
  type AttendanceScheduleSession,
} from "@/lib/attendance-schedule";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function resolveSessionClassName(session: {
  class_name?: string | null;
  classes?: { name?: string | null } | { name?: string | null }[] | null;
}): string {
  const fromSession = session.class_name?.trim();
  if (fromSession) {
    return fromSession;
  }

  const classRow = Array.isArray(session.classes)
    ? session.classes[0]
    : session.classes;
  const fromClass = classRow?.name?.trim();

  return fromClass || "Unnamed class";
}

interface SessionAttendeeRow {
  id: string;
  user_id: string;
  booking_status: string | null;
  attendance_status: string | null;
}

async function assertActiveClubMember(userId: string, clubId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, status")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify membership: ${error.message}`);
  }

  if (!data || data.status !== "active") {
    throw new Error("Student is not an active club member.");
  }
}

async function loadSessionAttendee(
  sessionId: string,
  userId: string,
): Promise<SessionAttendeeRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, user_id, booking_status, attendance_status")
    .eq("class_session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load session attendee: ${error.message}`);
  }

  return (data as SessionAttendeeRow | null) ?? null;
}

function isActiveSessionBookingStatus(status: string | null | undefined) {
  return status === "booked" || status === "waitlisted" || status === "walk_in";
}

async function createWalkInAttendee(sessionId: string, userId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .insert({
      class_session_id: sessionId,
      user_id: userId,
      booking_status: "walk_in",
      attendance_status: "not_marked",
      source: "student_booking",
      booked_at: new Date().toISOString(),
    })
    .select("id, user_id, booking_status, attendance_status")
    .single();

  if (error) {
    throw new Error(`Unable to add walk-in attendee: ${error.message}`);
  }

  return data as SessionAttendeeRow;
}

async function reactivateWalkInAttendee(attendeeId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .update({
      booking_status: "walk_in",
      attendance_status: "not_marked",
      source: "student_booking",
      booked_at: new Date().toISOString(),
    })
    .eq("id", attendeeId)
    .select("id, user_id, booking_status, attendance_status")
    .single();

  if (error) {
    throw new Error(`Unable to add walk-in attendee: ${error.message}`);
  }

  return data as SessionAttendeeRow;
}

function buildKioskStudentOptions(input: {
  bookedAttendees: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    attendeeId: string;
    isPresent: boolean;
  }[];
  eligibleStudents: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    label: string;
  }[];
}): AttendanceKioskStudentOption[] {
  const options = new Map<string, AttendanceKioskStudentOption>();

  for (const attendee of input.bookedAttendees) {
    options.set(attendee.userId, {
      userId: attendee.userId,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      label: getStudentFullName(attendee.firstName, attendee.lastName),
      email: attendee.email,
      isBooked: true,
      isPresent: attendee.isPresent,
      attendeeId: attendee.attendeeId,
    });
  }

  for (const student of input.eligibleStudents) {
    if (options.has(student.id)) {
      continue;
    }

    options.set(student.id, {
      userId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      label: student.label,
      email: student.email,
      isBooked: false,
      isPresent: false,
      attendeeId: null,
    });
  }

  return Array.from(options.values()).sort((left, right) => {
    if (left.isBooked !== right.isBooked) {
      return left.isBooked ? -1 : 1;
    }

    return compareAttendanceRegisterNames(
      left.firstName,
      left.lastName,
      right.firstName,
      right.lastName,
    );
  });
}

export interface AttendanceKioskPageData {
  clubName: string;
  clubSlug: string;
  sessionId: string;
  className: string;
  timeLabel: string;
  locationLabel: string;
  isCancelled: boolean;
  markingDisabled: boolean;
  students: AttendanceKioskStudentOption[];
}

export async function loadAttendanceKioskPageData(
  clubId: string,
  clubSlug: string,
  clubName: string,
  sessionId: string,
): Promise<AttendanceKioskPageData | null> {
  const details = await getAttendanceSessionDetails(sessionId);

  if (!details || details.clubId !== clubId) {
    return null;
  }

  const { session, endsAt, externalId, isCancelled, status, programmeType } = details;
  const scheduleSession: AttendanceScheduleSession = {
    id: session.id,
    classId: session.class_id,
    className: resolveSessionClassName(session),
    programmeId: null,
    startsAt: session.starts_at,
    endsAt,
    externalId,
    location: session.location,
    capacity: null,
    bookedCount: session.session_attendees.length,
    spacesAvailable: null,
    status,
    isCancelled,
  };

  const bookedAttendees = session.session_attendees
    .filter((attendee): attendee is typeof attendee & { user_id: string } =>
      Boolean(attendee.user_id),
    )
    .map((attendee) => {
      const user = Array.isArray(attendee.users)
        ? attendee.users[0]
        : attendee.users;

      return {
        userId: attendee.user_id,
        firstName: user?.first_name ?? null,
        lastName: user?.last_name ?? null,
        email: user?.email ?? null,
        attendeeId: attendee.id,
        isPresent: attendee.attendance_status === "present",
      };
    });

  const eligibleStudents = await getBookingStudentOptions(clubId, {
    programmeType,
  });
  const eligibleStudentIds = eligibleStudents.map((student) => student.id);
  let eligibleStudentProfiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }[] = [];

  if (eligibleStudentIds.length > 0) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", eligibleStudentIds);

    if (error) {
      throw new Error(`Unable to load kiosk student profiles: ${error.message}`);
    }

    eligibleStudentProfiles = (data ?? []) as typeof eligibleStudentProfiles;
  }

  const eligibleStudentOptions = eligibleStudents.map((student) => {
    const profile = eligibleStudentProfiles.find((row) => row.id === student.id);

    return {
      id: student.id,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      email: profile?.email ?? student.email,
      label: student.label,
    };
  });

  return {
    clubName,
    clubSlug,
    sessionId,
    className: resolveSessionClassName(session),
    timeLabel: formatAttendanceSessionTimeRange(scheduleSession),
    locationLabel: session.location?.trim() || "Location not set",
    isCancelled,
    markingDisabled: isCancelled || status === "completed",
    students: buildKioskStudentOptions({
      bookedAttendees,
      eligibleStudents: eligibleStudentOptions,
    }),
  };
}

export async function kioskCheckInStudent(input: {
  sessionId: string;
  userId: string;
  clubId: string;
  classId: string;
  confirmWalkIn?: boolean;
}): Promise<AttendanceKioskCheckInResult> {
  const details = await getAttendanceSessionDetails(input.sessionId);

  if (!details || details.clubId !== input.clubId) {
    throw new Error("This session is not available for this academy.");
  }

  if (details.isCancelled || details.status === "completed") {
    throw new Error("Check-in is not available for this session.");
  }

  await assertActiveClubMember(input.userId, input.clubId);

  const supabase = getSupabaseServerClient();
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", input.userId)
    .maybeSingle();

  if (userError) {
    throw new Error(`Unable to load student profile: ${userError.message}`);
  }

  const studentName = getStudentFullName(
    userRow?.first_name ?? null,
    userRow?.last_name ?? null,
  );

  let attendee = await loadSessionAttendee(input.sessionId, input.userId);

  if (attendee?.attendance_status === "present") {
    return { status: "already_present", studentName };
  }

  const hasActiveBooking =
    attendee !== null && isActiveSessionBookingStatus(attendee.booking_status);

  if (!hasActiveBooking && !input.confirmWalkIn) {
    return { status: "not_booked_for_session", studentName };
  }

  if (!hasActiveBooking) {
    attendee = attendee
      ? await reactivateWalkInAttendee(attendee.id)
      : await createWalkInAttendee(input.sessionId, input.userId);
  }

  if (!input.confirmWalkIn) {
    await assertStudentCanBookClassProgramme({
      userId: input.userId,
      clubId: input.clubId,
      classId: input.classId,
    });
  }

  await applySessionAttendeeAttendanceStatus(attendee!.id, "present");

  return { status: "marked_present", studentName };
}
