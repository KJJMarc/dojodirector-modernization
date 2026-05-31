import "server-only";

import { getAdminStudentProfilePageData } from "@/lib/admin-student-profile.server";
import { formatBookingDate, formatBookingTime } from "@/lib/booking";
import { resolveSessionLocationFromRow } from "@/lib/class-session-schedule";
import { getStudentAttendanceCardData } from "@/lib/attendance-card.server";
import { getStudentClubContextForAttendance } from "@/lib/attendance-card-manual.server";
import { getStudentAgreementStatus } from "@/lib/student-portal-agreements.server";
import {
  loadInstructorNameBySessionId,
  loadStudentPortalBookableSessionGroups,
} from "@/lib/student-portal-booking.server";
import { formatPortalBookingStatus } from "@/lib/student-portal-format.shared";
import type {
  StudentPortalAttendancePageData,
  StudentPortalBookPageData,
  StudentPortalBookingsPageData,
  StudentPortalPageData,
  StudentPortalUpcomingBooking,
} from "@/lib/student-portal.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type {
  StudentPortalAttendancePageData,
  StudentPortalBookPageData,
  StudentPortalBookingsPageData,
  StudentPortalPageData,
  StudentPortalUpcomingBooking,
};

interface SessionAttendeeBookingRow {
  id: string;
  booking_status: string | null;
  class_sessions:
    | {
        id: string;
        starts_at: string;
        ends_at: string | null;
        capacity: number | null;
        status: string | null;
        source: string | null;
        external_id: string | null;
        classes: { name: string } | { name: string }[] | null;
      }
    | {
        id: string;
        starts_at: string;
        ends_at: string | null;
        capacity: number | null;
        status: string | null;
        source: string | null;
        external_id: string | null;
        classes: { name: string } | { name: string }[] | null;
      }[]
    | null;
}

function normalizeClassSession(
  session: SessionAttendeeBookingRow["class_sessions"],
) {
  if (!session) {
    return null;
  }

  return Array.isArray(session) ? (session[0] ?? null) : session;
}

function formatBookingTimeRange(startsAt: string, endsAt: string | null) {
  if (!endsAt) {
    return formatBookingTime(startsAt);
  }

  return `${formatBookingTime(startsAt)} – ${formatBookingTime(endsAt)}`;
}

function formatBookingStatusLabel(status: string | null) {
  return formatPortalBookingStatus(status);
}

function resolveClassName(
  classes: { name: string } | { name: string }[] | null,
) {
  if (!classes) {
    return "Class";
  }

  const classRow = Array.isArray(classes) ? classes[0] : classes;
  return classRow?.name?.trim() || "Class";
}

async function loadStudentUpcomingBookings(
  userId: string,
  clubId: string,
): Promise<StudentPortalUpcomingBooking[]> {
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("session_attendees")
    .select(
      `
      id,
      booking_status,
      class_sessions (
        id,
        starts_at,
        ends_at,
        capacity,
        status,
        source,
        external_id,
        classes ( name )
      )
    `,
    )
    .eq("user_id", userId)
    .in("booking_status", ["booked", "waitlisted"])
    .order("booked_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load upcoming bookings: ${error.message}`);
  }

  const pendingBookings: Array<
    StudentPortalUpcomingBooking & { classSessionId: string }
  > = [];

  for (const row of (data ?? []) as unknown as SessionAttendeeBookingRow[]) {
    const session = normalizeClassSession(row.class_sessions);

    if (!session) {
      continue;
    }

    if (session.status === "cancelled" || session.starts_at < nowIso) {
      continue;
    }

    pendingBookings.push({
      id: row.id,
      classSessionId: session.id,
      className: resolveClassName(session.classes),
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      locationLabel: resolveSessionLocationFromRow(session) ?? "Location TBC",
      instructorName: null,
      bookingStatus: formatBookingStatusLabel(row.booking_status),
      dateLabel: formatBookingDate(session.starts_at),
      timeLabel: formatBookingTimeRange(session.starts_at, session.ends_at),
    });
  }

  const instructorNameBySessionId = await loadInstructorNameBySessionId(
    clubId,
    pendingBookings.map((booking) => booking.classSessionId),
  );

  const bookings: StudentPortalUpcomingBooking[] = pendingBookings.map(
    ({ classSessionId, ...booking }) => ({
      ...booking,
      instructorName:
        instructorNameBySessionId.get(classSessionId) ?? null,
    }),
  );

  return bookings.sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}

export async function getStudentPortalPageData(
  userId: string,
  year: number,
): Promise<StudentPortalPageData> {
  const { clubId } = await getStudentClubContextForAttendance(userId);

  const [profile, attendanceCard, agreementStatus] = await Promise.all([
    getAdminStudentProfilePageData(userId, clubId),
    getStudentAttendanceCardData(userId, year, clubId),
    getStudentAgreementStatus(userId),
  ]);

  return {
    studentName: profile.student.fullName,
    membershipStatus: profile.student.membershipStatus,
    currentBeltLabel: profile.belt.currentBeltLabel,
    agreementStatus,
    attendanceCardYear: attendanceCard.year,
    attendanceRows: attendanceCard.rows,
    totalAttendanceForYear: attendanceCard.totalAttendance,
    attendanceBeltLabel: attendanceCard.beltLabel,
  };
}

export async function getStudentPortalAttendancePageData(
  userId: string,
  year: number,
): Promise<StudentPortalAttendancePageData> {
  const { clubId } = await getStudentClubContextForAttendance(userId);

  const [profile, attendanceCard] = await Promise.all([
    getAdminStudentProfilePageData(userId, clubId),
    getStudentAttendanceCardData(userId, year, clubId),
  ]);

  return {
    studentName: profile.student.fullName,
    year: attendanceCard.year,
    attendanceRows: attendanceCard.rows,
    totalAttendanceForYear: attendanceCard.totalAttendance,
    attendanceBeltLabel: attendanceCard.beltLabel,
  };
}

export async function getStudentPortalBookingsPageData(
  userId: string,
): Promise<StudentPortalBookingsPageData> {
  const { clubId } = await getStudentClubContextForAttendance(userId);

  const [profile, upcomingBookings] = await Promise.all([
    getAdminStudentProfilePageData(userId, clubId),
    loadStudentUpcomingBookings(userId, clubId),
  ]);

  return {
    studentName: profile.student.fullName,
    upcomingBookings,
  };
}

export async function getStudentPortalBookPageData(
  userId: string,
): Promise<StudentPortalBookPageData> {
  const { clubId } = await getStudentClubContextForAttendance(userId);

  const [profile, bookableSessionGroups] = await Promise.all([
    getAdminStudentProfilePageData(userId, clubId),
    loadStudentPortalBookableSessionGroups(userId, clubId),
  ]);

  return {
    studentName: profile.student.fullName,
    bookableSessionGroups,
  };
}
