import "server-only";

import {
  loadStudentBjjFeatureVisibility,
  studentHasActiveBjjProgrammeMembership,
} from "@/lib/admin-programmes.server";
import { getAdminStudentProfilePageData } from "@/lib/admin-student-profile.server";
import {
  formatScheduleTimeRange,
  formatSessionDateLabelForDisplay,
  resolveSessionLocationFromRow,
} from "@/lib/class-session-schedule";
import { getStudentAttendanceCardData } from "@/lib/attendance-card.server";
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
  StudentPortalGradingHistoryPageData,
  StudentPortalPageData,
  StudentPortalUpcomingBooking,
} from "@/lib/student-portal.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type {
  StudentPortalAttendancePageData,
  StudentPortalBookPageData,
  StudentPortalBookingsPageData,
  StudentPortalGradingHistoryPageData,
  StudentPortalPageData,
  StudentPortalUpcomingBooking,
};

export { getStudentPortalGradingHistoryPageData } from "@/lib/student-portal-grading-history.server";

import {
  formatStudentBookingCancelBlockedMessage,
  resolveStudentBookingCancellation,
} from "@/lib/student-portal-booking-cancel.shared";

interface SessionAttendeeBookingRow {
  id: string;
  booking_status: string | null;
  attendance_status: string | null;
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
      attendance_status,
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
    .eq("booking_status", "booked")
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

    const cancellation = resolveStudentBookingCancellation({
      sessionStartsAt: session.starts_at,
      sessionEndsAt: session.ends_at,
      attendanceStatus: row.attendance_status,
    });

    pendingBookings.push({
      id: row.id,
      classSessionId: session.id,
      className: resolveClassName(session.classes),
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      locationLabel: resolveSessionLocationFromRow(session) ?? "Location TBC",
      instructorName: null,
      bookingStatus: formatBookingStatusLabel(row.booking_status),
      dateLabel: formatSessionDateLabelForDisplay({
        startsAt: session.starts_at,
        externalId: session.external_id,
      }),
      timeLabel: formatScheduleTimeRange(
        session.starts_at,
        session.ends_at,
        session.external_id,
      ),
      canCancelBooking: cancellation.canCancelBooking,
      cancelBlockedReason: cancellation.cancelBlockedReason,
      cancelBlockedMessage: formatStudentBookingCancelBlockedMessage(
        cancellation.cancelBlockedReason,
      ),
    });
  }

  const instructorNameBySessionId = await loadInstructorNameBySessionId(
    clubId,
    pendingBookings.map((booking) => booking.classSessionId),
  );

  const bookings: StudentPortalUpcomingBooking[] = pendingBookings.map(
    (booking) => ({
      ...booking,
      instructorName:
        instructorNameBySessionId.get(booking.classSessionId) ?? null,
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
  clubId: string,
): Promise<StudentPortalPageData> {
  const [bjjFeatures, hasBjjProgrammeMembership] = await Promise.all([
    loadStudentBjjFeatureVisibility(clubId, userId),
    studentHasActiveBjjProgrammeMembership(clubId, userId),
  ]);

  const [profile, agreementStatus, attendanceCard] = await Promise.all([
    getAdminStudentProfilePageData(userId, clubId),
    getStudentAgreementStatus(userId),
    bjjFeatures.showAttendanceCard
      ? getStudentAttendanceCardData(userId, year, clubId)
      : Promise.resolve(null),
  ]);

  return {
    studentName: profile.student.fullName,
    membershipStatus: profile.student.membershipStatus,
    currentBeltLabel: profile.belt.currentBeltLabel,
    agreementStatus,
    showBjjPortalActions: hasBjjProgrammeMembership,
    showBjjAttendanceCard: bjjFeatures.showAttendanceCard,
    showCurrentBelt: bjjFeatures.showBeltSummary,
    ...(attendanceCard
      ? {
          attendanceCardYear: attendanceCard.year,
          attendanceRows: attendanceCard.rows,
          totalAttendanceForYear: attendanceCard.totalAttendance,
          attendanceBeltLabel: attendanceCard.beltLabel,
          attendanceHeaderStats: attendanceCard.headerStats,
        }
      : {}),
  };
}

export async function getStudentPortalAttendancePageData(
  userId: string,
  year: number,
  clubId: string,
): Promise<StudentPortalAttendancePageData> {
  const bjjFeatures = await loadStudentBjjFeatureVisibility(clubId, userId);

  if (!bjjFeatures.showAttendanceCard) {
    throw new Error("Attendance cards are not available.");
  }

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
    attendanceHeaderStats: attendanceCard.headerStats,
  };
}

export async function getStudentPortalBookingsPageData(
  userId: string,
  clubId: string,
): Promise<StudentPortalBookingsPageData> {
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
  clubId: string,
): Promise<StudentPortalBookPageData> {
  const [profile, bookableSessionGroups] = await Promise.all([
    getAdminStudentProfilePageData(userId, clubId),
    loadStudentPortalBookableSessionGroups(userId, clubId),
  ]);

  return {
    studentName: profile.student.fullName,
    bookableSessionGroups,
  };
}
