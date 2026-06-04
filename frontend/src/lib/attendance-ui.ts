import { utcIsoToLondonTime } from "@/lib/london-datetime";
import { AttendanceStatus } from "@/types/database";

export interface AttendanceCounts {
  booked: number;
  present: number;
  absent: number;
  unmarked: number;
}

export function countAttendance(
  attendees: { attendance_status: AttendanceStatus }[],
): AttendanceCounts {
  const booked = attendees.length;
  const present = attendees.filter((a) => a.attendance_status === "present")
    .length;
  const absent = attendees.filter((a) => a.attendance_status === "absent")
    .length;
  const unmarked = booked - present - absent;

  return { booked, present, absent, unmarked };
}

/** @deprecated Prefer formatAttendanceSessionTimeRange from attendance-schedule. */
export function formatSessionStartsAt(startsAt: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(startsAt));
}

export function formatSessionStartsAtLondon(startsAt: string) {
  return utcIsoToLondonTime(startsAt);
}
