import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseDuplicateKeyError,
  logAttendanceMarking,
  serializeSupabaseError,
  type AttendanceMarkAction,
} from "@/lib/attendance-marking.shared";
import { utcIsoToLondonDate } from "@/lib/london-datetime";

export type SyncAttendanceStatus = "present" | "absent" | "not_marked";

interface ClassSessionRef {
  club_id: string;
  starts_at: string;
}

interface SessionAttendeeWithSession {
  id: string;
  user_id: string;
  class_session_id: string;
  class_sessions: ClassSessionRef | ClassSessionRef[] | null;
}

export interface AttendanceRecordContext {
  userId: string;
  clubId: string;
  classSessionId: string;
  attendedOn: string;
}

function getClassSession(
  classSessions: SessionAttendeeWithSession["class_sessions"],
): ClassSessionRef | null {
  if (!classSessions) {
    return null;
  }

  return Array.isArray(classSessions) ? classSessions[0] ?? null : classSessions;
}

export function getAttendedOnFromSessionStart(startsAt: string): string {
  return utcIsoToLondonDate(startsAt);
}

export async function getAttendanceRecordContext(
  supabase: SupabaseClient,
  attendeeId: string,
): Promise<AttendanceRecordContext> {
  const { data, error } = await supabase
    .from("session_attendees")
    .select(
      "id, user_id, class_session_id, class_sessions(club_id, starts_at)",
    )
    .eq("id", attendeeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load session attendee: ${error.message}`);
  }

  if (!data) {
    throw new Error("Session attendee not found.");
  }

  const attendee = data as SessionAttendeeWithSession;
  const classSession = getClassSession(attendee.class_sessions);

  if (!classSession?.club_id || !classSession.starts_at) {
    throw new Error("Unable to resolve class session details for attendance sync.");
  }

  return {
    userId: attendee.user_id,
    clubId: classSession.club_id,
    classSessionId: attendee.class_session_id,
    attendedOn: getAttendedOnFromSessionStart(classSession.starts_at),
  };
}

export async function syncAttendanceRecordForStatus(
  supabase: SupabaseClient,
  context: AttendanceRecordContext,
  attendanceStatus: SyncAttendanceStatus,
  logContext: {
    action: AttendanceMarkAction;
    attendeeId?: string;
    clubSlug?: string;
  } = { action: attendanceStatus },
) {
  if (attendanceStatus === "present") {
    const { data: existing, error: fetchError } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("user_id", context.userId)
      .eq("club_id", context.clubId)
      .eq("class_session_id", context.classSessionId)
      .eq("attended_on", context.attendedOn)
      .maybeSingle();

    if (fetchError) {
      logAttendanceMarking("error", {
        phase: "syncAttendanceRecordForStatus.fetch",
        action: logContext.action,
        attendeeId: logContext.attendeeId,
        sessionId: context.classSessionId,
        clubId: context.clubId,
        clubSlug: logContext.clubSlug,
        userId: context.userId,
        supabaseError: serializeSupabaseError(fetchError),
      });
      throw new Error(
        `Unable to check attendance record: ${fetchError.message}`,
      );
    }

    if (existing?.id) {
      logAttendanceMarking("info", {
        phase: "syncAttendanceRecordForStatus.present",
        action: logContext.action,
        attendeeId: logContext.attendeeId,
        sessionId: context.classSessionId,
        clubId: context.clubId,
        clubSlug: logContext.clubSlug,
        userId: context.userId,
        attendanceRecordId: existing.id,
        outcome: "already_present",
      });
      return existing.id as string;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        user_id: context.userId,
        club_id: context.clubId,
        class_session_id: context.classSessionId,
        attended_on: context.attendedOn,
        attended_at: new Date().toISOString(),
        source: "session_attendee",
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      if (isSupabaseDuplicateKeyError(insertError)) {
        logAttendanceMarking("info", {
          phase: "syncAttendanceRecordForStatus.present",
          action: logContext.action,
          attendeeId: logContext.attendeeId,
          sessionId: context.classSessionId,
          clubId: context.clubId,
          clubSlug: logContext.clubSlug,
          userId: context.userId,
          outcome: "duplicate_insert_ignored",
          supabaseError: serializeSupabaseError(insertError),
        });
        return null;
      }

      logAttendanceMarking("error", {
        phase: "syncAttendanceRecordForStatus.insert",
        action: logContext.action,
        attendeeId: logContext.attendeeId,
        sessionId: context.classSessionId,
        clubId: context.clubId,
        clubSlug: logContext.clubSlug,
        userId: context.userId,
        supabaseError: serializeSupabaseError(insertError),
      });
      throw new Error(`Unable to sync attendance record: ${insertError.message}`);
    }

    logAttendanceMarking("info", {
      phase: "syncAttendanceRecordForStatus.present",
      action: logContext.action,
      attendeeId: logContext.attendeeId,
      sessionId: context.classSessionId,
      clubId: context.clubId,
      clubSlug: logContext.clubSlug,
      userId: context.userId,
      attendanceRecordId: inserted?.id ?? null,
      outcome: "inserted",
    });

    return inserted?.id ?? null;
  }

  const { data: deletedRows, error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("user_id", context.userId)
    .eq("club_id", context.clubId)
    .eq("class_session_id", context.classSessionId)
    .eq("attended_on", context.attendedOn)
    .select("id");

  if (error) {
    logAttendanceMarking("error", {
      phase: "syncAttendanceRecordForStatus.delete",
      action: logContext.action,
      attendeeId: logContext.attendeeId,
      sessionId: context.classSessionId,
      clubId: context.clubId,
      clubSlug: logContext.clubSlug,
      userId: context.userId,
      supabaseError: serializeSupabaseError(error),
    });
    throw new Error(`Unable to remove attendance record: ${error.message}`);
  }

  logAttendanceMarking("info", {
    phase: "syncAttendanceRecordForStatus.delete",
    action: logContext.action,
    attendeeId: logContext.attendeeId,
    sessionId: context.classSessionId,
    clubId: context.clubId,
    clubSlug: logContext.clubSlug,
    userId: context.userId,
    attendanceRecordId: deletedRows?.[0]?.id ?? null,
    outcome: deletedRows && deletedRows.length > 0 ? "deleted" : "already_absent",
  });

  return deletedRows?.[0]?.id ?? null;
}
