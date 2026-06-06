import {
  ATTENDANCE_TIME_DISPLAY_FIX_VERSION,
  groupAttendanceSessionsByMonth,
  type AttendanceScheduleMonthGroup,
} from "@/lib/attendance-schedule";
import { AttendanceScheduleList } from "@/components/attendance/attendance-schedule-list";
import type { AttendanceRegisterNavContext } from "@/lib/attendance-register-navigation.shared";

interface AttendanceSessionScheduleSectionsProps {
  monthGroups: AttendanceScheduleMonthGroup[];
  navContext?: AttendanceRegisterNavContext | null;
  emptyMessage?: string;
}

export function AttendanceSessionScheduleSections({
  monthGroups,
  navContext = null,
  emptyMessage = "No sessions scheduled in the next 8 weeks.",
}: AttendanceSessionScheduleSectionsProps) {
  if (monthGroups.length === 0) {
    return (
      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
        {emptyMessage}
      </section>
    );
  }

  return (
    <div
      className="space-y-6"
      data-attendance-time-fix={ATTENDANCE_TIME_DISPLAY_FIX_VERSION}
    >
      {monthGroups.map((monthGroup) => (
        <AttendanceScheduleList
          key={monthGroup.monthKey}
          monthLabel={monthGroup.monthLabel}
          dateGroups={monthGroup.dateGroups}
          navContext={navContext}
        />
      ))}
    </div>
  );
}
