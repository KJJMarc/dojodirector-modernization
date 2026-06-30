"use server";

import { revalidatePath } from "next/cache";
import {
  applySessionAttendeeAttendanceStatus,
  AttendanceMarkingError,
} from "@/lib/attendance-marking.server";
import {
  ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE,
  ATTENDANCE_MARK_INVALID_PAYLOAD_MESSAGE,
  formatAttendanceMarkDevMessage,
  logAttendanceMarking,
  shouldExposeAttendanceMarkDevDetails,
  type MarkAttendanceResult,
} from "@/lib/attendance-marking.shared";
import type { SyncAttendanceStatus } from "@/lib/attendance-records-sync";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

const VALID_STATUS = new Set<SyncAttendanceStatus>([
  "present",
  "absent",
  "not_marked",
]);

async function resolveAttendanceMarkAuthContext() {
  try {
    const supabase = await createSupabaseServerAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      authUserId: user?.id ?? null,
      authEmail: user?.email ?? null,
    };
  } catch (error) {
    logAttendanceMarking("error", {
      phase: "resolveAttendanceMarkAuthContext",
      message:
        error instanceof Error
          ? error.message
          : "Unable to resolve attendance mark auth context.",
    });

    return {
      authUserId: null,
      authEmail: null,
    };
  }
}

export async function markAttendance(
  formData: FormData,
): Promise<MarkAttendanceResult> {
  const attendeeId = String(formData.get("attendeeId") ?? "");
  const attendanceStatus = String(formData.get("attendanceStatus") ?? "");
  const authContext = await resolveAttendanceMarkAuthContext();

  if (
    !attendeeId ||
    !VALID_STATUS.has(attendanceStatus as SyncAttendanceStatus)
  ) {
    logAttendanceMarking("error", {
      phase: "markAttendance.validate",
      action: attendanceStatus as SyncAttendanceStatus,
      attendeeId: attendeeId || undefined,
      authUserId: authContext.authUserId,
      authEmail: authContext.authEmail,
      outcome: "invalid_payload",
    });

    return {
      status: "error",
      message: ATTENDANCE_MARK_INVALID_PAYLOAD_MESSAGE,
    };
  }

  try {
    const result = await applySessionAttendeeAttendanceStatus(
      attendeeId,
      attendanceStatus as SyncAttendanceStatus,
      authContext,
    );

    revalidatePath("/attendance");
    revalidatePath(`/attendance/${result.sessionId}`);

    return {
      status: "success",
      sessionId: result.sessionId,
      outcome: result.outcome,
    };
  } catch (error) {
    if (error instanceof AttendanceMarkingError) {
      return {
        status: "error",
        message: error.safeMessage,
        ...(shouldExposeAttendanceMarkDevDetails()
          ? { devMessage: formatAttendanceMarkDevMessage(error.logContext) }
          : {}),
      };
    }

    return {
      status: "error",
      message: ATTENDANCE_MARK_GENERIC_ERROR_MESSAGE,
      ...(shouldExposeAttendanceMarkDevDetails()
        ? {
            devMessage:
              error instanceof Error ? error.message : "Unknown attendance marking error.",
          }
        : {}),
    };
  }
}
