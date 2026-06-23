export const ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE =
  "Unable to save attendance. Please try again.";

export const ATTENDANCE_MARK_INVALID_PAYLOAD_MESSAGE =
  "Unable to save attendance. Please refresh the register and try again.";

export const ATTENDANCE_MARK_CANCELLED_SESSION_MESSAGE =
  "Attendance cannot be marked for a cancelled class.";

export const ATTENDANCE_MARK_ATTENDEE_NOT_FOUND_MESSAGE =
  "This booking is no longer on the register. Please refresh and try again.";

export type AttendanceMarkAction = "present" | "absent" | "not_marked";

export type MarkAttendanceResult =
  | { status: "success"; sessionId: string; outcome: "updated" | "already_marked" }
  | { status: "error"; message: string };

export interface AttendanceMarkingLogContext {
  phase: string;
  action?: AttendanceMarkAction;
  attendeeId?: string;
  sessionId?: string;
  clubId?: string;
  clubSlug?: string;
  userId?: string | null;
  attendanceRecordId?: string | null;
  authUserId?: string | null;
  authEmail?: string | null;
  outcome?: string;
  supabaseError?: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  message?: string;
}

export function isSupabaseDuplicateKeyError(error: {
  code?: string;
  message?: string;
} | null | undefined) {
  if (!error) {
    return false;
  }

  if (error.code === "23505") {
    return true;
  }

  return /duplicate key/i.test(error.message ?? "");
}

export function serializeSupabaseError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null | undefined) {
  if (!error) {
    return undefined;
  }

  return {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  };
}

export function logAttendanceMarking(
  level: "info" | "error",
  context: AttendanceMarkingLogContext,
) {
  const payload = {
  ...context,
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error("[attendance-marking]", payload);
    return;
  }

  console.info("[attendance-marking]", payload);
}
