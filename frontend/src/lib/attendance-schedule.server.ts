import "server-only";

import { loadClassScheduleSessions } from "@/lib/class-session-schedule.server";
import type { AttendanceScheduleSession } from "@/lib/attendance-schedule";
import {
  getAttendanceScheduleDateRange,
  getAttendanceScheduleFilterDateRange,
  type AttendanceScheduleFilter,
} from "@/lib/attendance-schedule";

async function loadAttendanceScheduleSessionsInRange(
  startIso: string,
  endIso: string,
  clubId?: string,
  ensureRecurringSessions = true,
): Promise<AttendanceScheduleSession[]> {
  return loadClassScheduleSessions({
    startIso,
    endIso,
    includeCancelled: true,
    clubId,
    ensureRecurringSessions,
  });
}

export async function getAttendanceScheduleSessions(
  clubId?: string,
): Promise<AttendanceScheduleSession[]> {
  const { startIso, endIso } = getAttendanceScheduleDateRange();

  return loadAttendanceScheduleSessionsInRange(startIso, endIso, clubId);
}

export async function getAttendanceScheduleSessionsForFilter(
  filter: AttendanceScheduleFilter,
  clubId?: string,
): Promise<AttendanceScheduleSession[]> {
  const { startIso, endIso } = getAttendanceScheduleFilterDateRange(filter);
  const ensureRecurringSessions = filter.mode === "default";

  return loadAttendanceScheduleSessionsInRange(
    startIso,
    endIso,
    clubId,
    ensureRecurringSessions,
  );
}
