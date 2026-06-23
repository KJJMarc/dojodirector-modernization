import "server-only";

import { revalidateAttendanceImpactPaths } from "@/lib/admin-revalidate.server";
import { getStudentFullName } from "@/lib/attendance";
import { getClubSlugById } from "@/lib/attendance-card-manual.server";
import {
  ATTENDANCE_MARK_ATTENDEE_NOT_FOUND_MESSAGE,
  ATTENDANCE_MARK_CANCELLED_SESSION_MESSAGE,
  ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE,
  logAttendanceMarking,
  serializeSupabaseError,
  type AttendanceMarkAction,
  type AttendanceMarkingLogContext,
} from "@/lib/attendance-marking.shared";
import {
  syncAttendanceRecordForStatus,
  type SyncAttendanceStatus,
} from "@/lib/attendance-records-sync";
import { utcIsoToLondonDate } from "@/lib/london-datetime";
import { matchLeadOnAttendanceRegisterMark } from "@/lib/lead-status-tracking.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SessionAttendeeMarkingRow {
  id: string;
  user_id: string | null;
  guest_booking_id: string | null;
  class_session_id: string;
  attendance_status: string | null;
}

interface ClassSessionMarkingRow {
  club_id: string;
  starts_at: string;
  status: string | null;
  classes: { name: string | null } | { name: string | null }[] | null;
}

interface GuestBookingLeadMatchRow {
  email: string;
  phone: string | null;
  lead_id: string | null;
}

export interface ApplyAttendanceMarkAuthContext {
  authUserId?: string | null;
  authEmail?: string | null;
}

export interface ApplyAttendanceMarkResult {
  sessionId: string;
  outcome: "updated" | "already_marked";
}

export class AttendanceMarkingError extends Error {
  readonly safeMessage: string;
  readonly logContext: AttendanceMarkingLogContext;

  constructor(safeMessage: string, logContext: AttendanceMarkingLogContext) {
    super(safeMessage);
    this.name = "AttendanceMarkingError";
    this.safeMessage = safeMessage;
    this.logContext = logContext;
  }
}

function logAttendanceMarkingFailure(
  error: unknown,
  baseContext: AttendanceMarkingLogContext,
) {
  if (error instanceof AttendanceMarkingError) {
    logAttendanceMarking("error", {
      ...baseContext,
      ...error.logContext,
      message: error.message,
    });
    return;
  }

  logAttendanceMarking("error", {
    ...baseContext,
    message: error instanceof Error ? error.message : "Unknown attendance marking error.",
  });
}

async function loadSessionAttendeeForMarking(
  supabase: SupabaseClient,
  attendeeId: string,
  baseContext: AttendanceMarkingLogContext,
): Promise<SessionAttendeeMarkingRow> {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, user_id, guest_booking_id, class_session_id, attendance_status")
    .eq("id", attendeeId)
    .maybeSingle();

  if (error) {
    throw new AttendanceMarkingError(ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE, {
      ...baseContext,
      phase: "loadSessionAttendeeForMarking",
      supabaseError: serializeSupabaseError(error),
    });
  }

  if (!data) {
    throw new AttendanceMarkingError(ATTENDANCE_MARK_ATTENDEE_NOT_FOUND_MESSAGE, {
      ...baseContext,
      phase: "loadSessionAttendeeForMarking",
      outcome: "attendee_not_found",
    });
  }

  return data as SessionAttendeeMarkingRow;
}

async function loadClassSessionForMarking(
  supabase: SupabaseClient,
  sessionId: string,
  baseContext: AttendanceMarkingLogContext,
): Promise<ClassSessionMarkingRow> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("club_id, starts_at, status, classes(name)")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new AttendanceMarkingError(ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE, {
      ...baseContext,
      phase: "loadClassSessionForMarking",
      sessionId,
      supabaseError: serializeSupabaseError(error),
    });
  }

  if (!data) {
    throw new AttendanceMarkingError(ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE, {
      ...baseContext,
      phase: "loadClassSessionForMarking",
      sessionId,
      outcome: "session_not_found",
    });
  }

  return data as ClassSessionMarkingRow;
}

async function loadGuestBookingForLeadMatch(
  supabase: SupabaseClient,
  guestBookingId: string,
) {
  const { data, error } = await supabase
    .from("guest_bookings")
    .select("email, phone, lead_id")
    .eq("id", guestBookingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load guest booking for lead match: ${error.message}`);
  }

  return (data as GuestBookingLeadMatchRow | null) ?? null;
}

function resolveClassName(classes: ClassSessionMarkingRow["classes"]) {
  const classRow = Array.isArray(classes) ? classes[0] : classes;
  return classRow?.name?.trim() || "Class";
}

function normalizeAttendanceStatus(
  status: string | null | undefined,
): SyncAttendanceStatus | null {
  if (status === "present" || status === "absent" || status === "not_marked") {
    return status;
  }

  return null;
}

async function syncLeadStatusFromAttendanceRegister(input: {
  attendee: SessionAttendeeMarkingRow;
  classSession: ClassSessionMarkingRow;
  nextStatus: Extract<SyncAttendanceStatus, "present" | "absent">;
}) {
  const sessionDateLabel = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(input.classSession.starts_at));
  const className = resolveClassName(input.classSession.classes);
  const adminSupabase = getSupabaseAdminClient();

  if (input.attendee.user_id) {
    const { data: userRow } = await adminSupabase
      .from("users")
      .select("first_name, last_name, email, phone, portal_login_email")
      .eq("id", input.attendee.user_id)
      .maybeSingle();

    const email =
      userRow?.email?.trim() || userRow?.portal_login_email?.trim() || "";

    await matchLeadOnAttendanceRegisterMark({
      academyId: input.classSession.club_id,
      attendanceStatus: input.nextStatus,
      email,
      phone: userRow?.phone?.trim() ?? null,
      fullName: getStudentFullName(userRow?.first_name ?? null, userRow?.last_name ?? null),
      className,
      sessionDateLabel,
      markedAtIso: input.classSession.starts_at,
    });
    return;
  }

  if (!input.attendee.guest_booking_id) {
    return;
  }

  const guestBooking = await loadGuestBookingForLeadMatch(
    adminSupabase,
    input.attendee.guest_booking_id,
  );

  if (!guestBooking) {
    return;
  }

  await matchLeadOnAttendanceRegisterMark({
    academyId: input.classSession.club_id,
    attendanceStatus: input.nextStatus,
    email: guestBooking.email.trim(),
    phone: guestBooking.phone?.trim() ?? null,
    leadId: guestBooking.lead_id,
    className,
    sessionDateLabel,
    markedAtIso: input.classSession.starts_at,
  });
}

export async function applySessionAttendeeAttendanceStatus(
  attendeeId: string,
  nextStatus: SyncAttendanceStatus,
  authContext: ApplyAttendanceMarkAuthContext = {},
): Promise<ApplyAttendanceMarkResult> {
  const baseContext: AttendanceMarkingLogContext = {
    phase: "applySessionAttendeeAttendanceStatus",
    action: nextStatus,
    attendeeId,
    authUserId: authContext.authUserId ?? null,
    authEmail: authContext.authEmail ?? null,
  };

  try {
    const supabase = getSupabaseServerClient();
    const attendee = await loadSessionAttendeeForMarking(
      supabase,
      attendeeId,
      baseContext,
    );
    const classSession = await loadClassSessionForMarking(
      supabase,
      attendee.class_session_id,
      {
        ...baseContext,
        sessionId: attendee.class_session_id,
        userId: attendee.user_id,
      },
    );
    const clubSlug = classSession.club_id
      ? await getClubSlugById(classSession.club_id)
      : undefined;
    const contextWithClub = {
      ...baseContext,
      sessionId: attendee.class_session_id,
      clubId: classSession.club_id,
      clubSlug,
      userId: attendee.user_id,
    };

    if (classSession.status === "cancelled") {
      throw new AttendanceMarkingError(ATTENDANCE_MARK_CANCELLED_SESSION_MESSAGE, {
        ...contextWithClub,
        phase: "validateSession",
        outcome: "cancelled_session",
      });
    }

    const previousStatus = normalizeAttendanceStatus(attendee.attendance_status);
    const alreadyMarked = previousStatus === nextStatus;

    if (!alreadyMarked) {
      const { error } = await supabase
        .from("session_attendees")
        .update({ attendance_status: nextStatus })
        .eq("id", attendeeId);

      if (error) {
        throw new AttendanceMarkingError(ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE, {
          ...contextWithClub,
          phase: "updateSessionAttendee",
          supabaseError: serializeSupabaseError(error),
        });
      }
    }

    if (attendee.user_id) {
      if (!classSession.club_id || !classSession.starts_at) {
        throw new AttendanceMarkingError(ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE, {
          ...contextWithClub,
          phase: "resolveAttendanceContext",
          outcome: "missing_session_details",
        });
      }

      const attendedOn = utcIsoToLondonDate(classSession.starts_at);
      const attendanceRecordId = await syncAttendanceRecordForStatus(
        supabase,
        {
          userId: attendee.user_id,
          clubId: classSession.club_id,
          classSessionId: attendee.class_session_id,
          attendedOn,
        },
        nextStatus,
        {
          action: nextStatus,
          attendeeId,
          clubSlug,
        },
      );

      contextWithClub.attendanceRecordId = attendanceRecordId;
    }

    if (
      !alreadyMarked &&
      (nextStatus === "present" || nextStatus === "absent") &&
      classSession.club_id &&
      classSession.starts_at
    ) {
      await syncLeadStatusFromAttendanceRegister({
        attendee,
        classSession,
        nextStatus,
      });
    }

    if (attendee.user_id && classSession.club_id && clubSlug) {
      revalidateAttendanceImpactPaths(clubSlug, attendee.user_id);
    }

    logAttendanceMarking("info", {
      ...contextWithClub,
      phase: "applySessionAttendeeAttendanceStatus",
      outcome: alreadyMarked ? "already_marked" : "updated",
    });

    return {
      sessionId: attendee.class_session_id,
      outcome: alreadyMarked ? "already_marked" : "updated",
    };
  } catch (error) {
    logAttendanceMarkingFailure(error, baseContext);

    if (error instanceof AttendanceMarkingError) {
      throw error;
    }

    throw new AttendanceMarkingError(ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE, {
      ...baseContext,
      phase: "applySessionAttendeeAttendanceStatus",
      message: error instanceof Error ? error.message : "Unknown attendance marking error.",
    });
  }
}
