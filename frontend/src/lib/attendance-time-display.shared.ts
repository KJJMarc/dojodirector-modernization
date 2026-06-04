import {
  formatSessionTimeRangeForDisplay,
  hasExternalSessionSlotTime,
} from "@/lib/class-session-schedule";

/** Bump when attendance register time display logic changes (verify on staging via data attribute). */
export const ATTENDANCE_TIME_DISPLAY_FIX_VERSION = "slot-external-id-v2";

export interface AttendanceSessionTimeInput {
  startsAt: string;
  endsAt: string | null;
  externalId?: string | null;
}

export function resolveAttendanceSessionTimeSource(
  session: AttendanceSessionTimeInput,
): "slot" | "utc" {
  return hasExternalSessionSlotTime(session.externalId) ? "slot" : "utc";
}

export function formatAttendanceSessionTimeRange(
  session: AttendanceSessionTimeInput,
) {
  return formatSessionTimeRangeForDisplay({
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    externalId: session.externalId,
  });
}

export function isAttendanceTimeDebugEnabled() {
  return process.env.NEXT_PUBLIC_ATTENDANCE_TIME_DEBUG === "1";
}
