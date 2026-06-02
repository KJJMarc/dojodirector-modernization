import "server-only";

import { loadClassScheduleSessions } from "@/lib/class-session-schedule.server";
import type { AttendanceScheduleSession } from "@/lib/attendance-schedule";
import { getAttendanceScheduleDateRange } from "@/lib/attendance-schedule";

export async function getAttendanceScheduleSessions(
  clubId?: string,
): Promise<AttendanceScheduleSession[]> {
  const { startIso, endIso } = getAttendanceScheduleDateRange();

  return loadClassScheduleSessions({
    startIso,
    endIso,
    includeCancelled: true,
    clubId,
  });
}
