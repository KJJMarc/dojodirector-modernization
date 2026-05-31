import type { AttendanceCardHeaderStats } from "@/lib/attendance-card";
import { formatProfileDate } from "@/lib/admin-student-profile.shared";

export function formatYearClassesAttended(total: number) {
  return `${total} ${total === 1 ? "class" : "classes"} attended`;
}

export function formatAttendanceCardProgressLine(stats: AttendanceCardHeaderStats) {
  return [
    `Lifetime attendance: ${stats.lifetimeBjjAttendanceCount}`,
    `Last attendance: ${formatProfileDate(stats.lastAttendanceDate)}`,
  ].join(" · ");
}
