export type StudentBookingCancelBlockedReason =
  | "past_booking"
  | "session_started"
  | "attendance_recorded"
  | null;

export function isAttendanceMarkedForCancellation(
  attendanceStatus: string | null | undefined,
) {
  return attendanceStatus === "present" || attendanceStatus === "absent";
}

export function resolveStudentBookingCancellation(input: {
  sessionStartsAt: string;
  sessionEndsAt?: string | null;
  attendanceStatus: string | null | undefined;
  nowMs?: number;
}): {
  canCancelBooking: boolean;
  cancelBlockedReason: StudentBookingCancelBlockedReason;
} {
  const nowMs = input.nowMs ?? Date.now();
  const sessionStartMs = new Date(input.sessionStartsAt).getTime();
  const sessionEndMs = input.sessionEndsAt
    ? new Date(input.sessionEndsAt).getTime()
    : Number.NaN;

  if (!Number.isNaN(sessionEndMs) && sessionEndMs <= nowMs) {
    return {
      canCancelBooking: false,
      cancelBlockedReason: "past_booking",
    };
  }

  if (Number.isNaN(sessionStartMs) || sessionStartMs <= nowMs) {
    return {
      canCancelBooking: false,
      cancelBlockedReason: "session_started",
    };
  }

  if (isAttendanceMarkedForCancellation(input.attendanceStatus)) {
    return {
      canCancelBooking: false,
      cancelBlockedReason: "attendance_recorded",
    };
  }

  return {
    canCancelBooking: true,
    cancelBlockedReason: null,
  };
}

export function formatStudentBookingCancelBlockedMessage(
  reason: StudentBookingCancelBlockedReason,
) {
  switch (reason) {
    case "past_booking":
      return "Past booking";
    case "session_started":
      return "This class has already started.";
    case "attendance_recorded":
      return "Attendance has already been recorded.";
    default:
      return null;
  }
}
