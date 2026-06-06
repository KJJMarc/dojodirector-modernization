"use server";

import { revalidatePath } from "next/cache";
import {
  applySessionAttendeeAttendanceStatus,
} from "@/lib/attendance-marking.server";
import type { SyncAttendanceStatus } from "@/lib/attendance-records-sync";

const VALID_STATUS = new Set<SyncAttendanceStatus>([
  "present",
  "absent",
  "not_marked",
]);

export async function markAttendance(formData: FormData) {
  const attendeeId = String(formData.get("attendeeId") ?? "");
  const attendanceStatus = String(formData.get("attendanceStatus") ?? "");

  if (
    !attendeeId ||
    !VALID_STATUS.has(attendanceStatus as SyncAttendanceStatus)
  ) {
    throw new Error("Invalid attendance update payload.");
  }

  const sessionId = await applySessionAttendeeAttendanceStatus(
    attendeeId,
    attendanceStatus as SyncAttendanceStatus,
  );

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${sessionId}`);
}
