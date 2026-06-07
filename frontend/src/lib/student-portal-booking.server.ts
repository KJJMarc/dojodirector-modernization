import "server-only";

import { cache } from "react";
import { getStudentFullName } from "@/lib/attendance";
import { formatBookingDate, getBookingDateRange } from "@/lib/booking";
import {
  formatPortalMemberBookingStatus,
  formatPortalSpacesAvailable,
} from "@/lib/student-portal-format.shared";
import {
  getEffectiveSpacesAvailable,
  isSessionPubliclyBookable,
} from "@/lib/session-waitlist.shared";
import { loadSessionWaitlistDisplayAndAvailabilityBySessionId } from "@/lib/session-waitlist.server";
import {
  formatScheduleDayLabel,
  formatScheduleTimeRange,
  type ClassScheduleSession,
} from "@/lib/class-session-schedule";
import { utcIsoToLondonDate } from "@/lib/london-datetime";
import { loadClassScheduleSessions } from "@/lib/class-session-schedule.server";
import { loadStudentActiveProgrammeIdsForBooking } from "@/lib/admin-programmes.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  StudentPortalBookableSession,
  StudentPortalBookableSessionGroup,
  StudentPortalMemberBookingStatus,
} from "@/lib/student-portal.shared";

interface SessionAttendeeStatusRow {
  id: string;
  class_session_id: string;
  booking_status: string | null;
  attendance_status: string | null;
}

interface MemberBookingDetails {
  status: StudentPortalMemberBookingStatus;
  attendeeId: string;
  attendanceStatus: string | null;
}

interface ClassSessionInstructorRow {
  id: string;
  recurring_schedule_id: string | null;
}

interface InstructorAssignmentRow {
  instructor_user_id: string;
  recurring_schedule_id: string | null;
  class_session_id: string | null;
}

interface InstructorUserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

/** Used by bookings list and admin metrics — not shown on Book a Class cards. */
export async function loadInstructorNameBySessionId(
  clubId: string,
  sessionIds: string[],
): Promise<Map<string, string>> {
  const instructorNameBySessionId = new Map<string, string>();

  if (sessionIds.length === 0) {
    return instructorNameBySessionId;
  }

  const supabase = getSupabaseAdminClient();

  const [sessionsResult, assignmentsResult] = await Promise.all([
    supabase
      .from("class_sessions")
      .select("id, recurring_schedule_id")
      .in("id", sessionIds),
    supabase
      .from("instructor_assignments")
      .select("instructor_user_id, recurring_schedule_id, class_session_id")
      .eq("club_id", clubId)
      .eq("is_active", true),
  ]);

  if (sessionsResult.error) {
    throw new Error(
      `Failed to load class sessions for instructors: ${sessionsResult.error.message}`,
    );
  }

  if (assignmentsResult.error) {
    throw new Error(
      `Failed to load instructor assignments: ${assignmentsResult.error.message}`,
    );
  }

  const sessionAssignmentBySessionId = new Map<string, string>();
  const recurringAssignmentByScheduleId = new Map<string, string>();

  for (const assignment of (assignmentsResult.data ??
    []) as InstructorAssignmentRow[]) {
    if (assignment.class_session_id) {
      sessionAssignmentBySessionId.set(
        assignment.class_session_id,
        assignment.instructor_user_id,
      );
      continue;
    }

    if (assignment.recurring_schedule_id) {
      recurringAssignmentByScheduleId.set(
        assignment.recurring_schedule_id,
        assignment.instructor_user_id,
      );
    }
  }

  const instructorUserIds = Array.from(
    new Set([
      ...Array.from(sessionAssignmentBySessionId.values()),
      ...Array.from(recurringAssignmentByScheduleId.values()),
    ]),
  );

  const instructorNameByUserId = new Map<string, string>();

  if (instructorUserIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", instructorUserIds);

    if (usersError) {
      throw new Error(`Failed to load instructors: ${usersError.message}`);
    }

    for (const user of (users ?? []) as InstructorUserRow[]) {
      instructorNameByUserId.set(
        user.id,
        getStudentFullName(user.first_name, user.last_name),
      );
    }
  }

  for (const session of (sessionsResult.data ?? []) as ClassSessionInstructorRow[]) {
    const sessionOverrideId = sessionAssignmentBySessionId.get(session.id);
    const instructorUserId =
      sessionOverrideId ??
      (session.recurring_schedule_id
        ? recurringAssignmentByScheduleId.get(session.recurring_schedule_id)
        : undefined);

    if (!instructorUserId) {
      continue;
    }

    const instructorName = instructorNameByUserId.get(instructorUserId);

    if (instructorName) {
      instructorNameBySessionId.set(session.id, instructorName);
    }
  }

  return instructorNameBySessionId;
}

function formatMemberBookingStatusLabel(
  status: StudentPortalMemberBookingStatus,
) {
  return formatPortalMemberBookingStatus(status);
}

function normalizeMemberBookingStatus(
  status: string | null,
): StudentPortalMemberBookingStatus {
  if (status === "booked") {
    return "booked";
  }

  return null;
}

async function loadMemberBookingDetailsBySessionId(
  userId: string,
  sessionIds: string[],
): Promise<Map<string, MemberBookingDetails>> {
  const detailsBySessionId = new Map<string, MemberBookingDetails>();

  if (sessionIds.length === 0) {
    return detailsBySessionId;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, class_session_id, booking_status, attendance_status")
    .eq("user_id", userId)
    .in("class_session_id", sessionIds)
    .eq("booking_status", "booked");

  if (error) {
    throw new Error(`Failed to load your booking status: ${error.message}`);
  }

  for (const row of (data ?? []) as SessionAttendeeStatusRow[]) {
    const status = normalizeMemberBookingStatus(row.booking_status);

    if (!status) {
      continue;
    }

    detailsBySessionId.set(row.class_session_id, {
      status,
      attendeeId: row.id,
      attendanceStatus: row.attendance_status,
    });
  }

  return detailsBySessionId;
}

function filterSessionsByStudentBookingAccess(
  sessions: ClassScheduleSession[],
  allowedProgrammeIds: Set<string> | null,
) {
  if (!allowedProgrammeIds) {
    return sessions;
  }

  return sessions.filter((session) => {
    if (!session.programmeId) {
      return true;
    }

    return allowedProgrammeIds.has(session.programmeId);
  });
}

export const loadStudentPortalBookableSessionGroups = cache(
  async function loadStudentPortalBookableSessionGroups(
    userId: string,
    clubId: string,
  ): Promise<StudentPortalBookableSessionGroup[]> {
  const { startIso, endIso } = getBookingDateRange();
  const [sessions, allowedProgrammeIds] = await Promise.all([
    loadClassScheduleSessions({
      startIso,
      endIso,
      includeCancelled: false,
      activeClassesOnly: true,
      clubId,
      ensureRecurringSessions: false,
    }),
    loadStudentActiveProgrammeIdsForBooking(userId, clubId),
  ]);

  const bookableClubSessions = filterSessionsByStudentBookingAccess(
    sessions,
    allowedProgrammeIds,
  );

  if (bookableClubSessions.length === 0) {
    return [];
  }

  const sessionIds = bookableClubSessions.map((session) => session.id);
  const waitlistLoaderOptions = { skipExpiryProcessing: true as const };
  const [memberBookingDetailsBySessionId, waitlistState] = await Promise.all([
    loadMemberBookingDetailsBySessionId(userId, sessionIds),
    loadSessionWaitlistDisplayAndAvailabilityBySessionId(
      userId,
      sessionIds,
      waitlistLoaderOptions,
    ),
  ]);
  const waitlistBySessionId = waitlistState.displayBySessionId;
  const waitlistAvailabilityBySessionId = waitlistState.availabilityBySessionId;

  const bookableSessions: StudentPortalBookableSession[] = bookableClubSessions.map(
    (session) => {
      const bookingDetails = memberBookingDetailsBySessionId.get(session.id);
      const memberBookingStatus = bookingDetails?.status ?? null;
      const waitlistInfo = waitlistBySessionId.get(session.id) ?? {
        waitlistStatus: null,
        waitlistPosition: null,
        waitlistCount: 0,
        offerExpiresAt: null,
      };
      const locationLabel =
        session.location?.trim() || "Location TBC";
      const waitlistAvailability = waitlistAvailabilityBySessionId.get(session.id) ?? {
        hasActiveWaitlistOffer: false,
        waitingQueueCount: 0,
      };
      const availabilityInput = {
        capacity: session.capacity,
        bookedCount: session.bookedCount,
        hasActiveWaitlistOffer: waitlistAvailability.hasActiveWaitlistOffer,
        waitingQueueCount: waitlistAvailability.waitingQueueCount,
      };
      const spacesAvailable = getEffectiveSpacesAvailable(availabilityInput);

      return {
        id: session.id,
        className: session.className ?? "Unnamed class",
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        locationLabel,
        spacesAvailable,
        spacesAvailableLabel: formatPortalSpacesAvailable(spacesAvailable),
        memberBookingStatus,
        memberBookingStatusLabel:
          formatMemberBookingStatusLabel(memberBookingStatus),
        waitlistStatus: waitlistInfo.waitlistStatus,
        waitlistPosition: waitlistInfo.waitlistPosition,
        waitlistCount: waitlistInfo.waitlistCount,
        offerExpiresAt: waitlistInfo.offerExpiresAt,
        dateLabel: formatBookingDate(session.startsAt),
        timeLabel: formatScheduleTimeRange(
          session.startsAt,
          session.endsAt,
          session.externalId,
        ),
        isFull: !isSessionPubliclyBookable(availabilityInput),
      };
    },
  );

  const groups = new Map<string, StudentPortalBookableSessionGroup>();

  for (const session of bookableSessions) {
    const dateKey = utcIsoToLondonDate(session.startsAt);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        dateLabel: session.dateLabel,
        dayLabel: formatScheduleDayLabel(session.startsAt),
        sessions: [],
      });
    }

    groups.get(dateKey)!.sessions.push(session);
  }

  return Array.from(groups.values());
  },
);
