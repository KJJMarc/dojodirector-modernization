import { AttendanceScheduleDateGroup } from "@/lib/attendance-schedule";
import { AttendanceSessionRow } from "@/components/attendance/attendance-session-row";

interface AttendanceScheduleDateGroupSectionProps {
  group: AttendanceScheduleDateGroup;
}

function AttendanceScheduleDateGroupSection({
  group,
}: AttendanceScheduleDateGroupSectionProps) {
  return (
    <section className="space-y-2">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-dojo-white">{group.dateLabel}</h3>
        <p className="text-xs text-dojo-muted">{group.dayLabel}</p>
      </div>
      <div className="space-y-2">
        {group.sessions.map((session) => (
          <AttendanceSessionRow key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}

interface AttendanceScheduleListProps {
  monthLabel: string;
  dateGroups: AttendanceScheduleDateGroup[];
}

export function AttendanceScheduleList({
  monthLabel,
  dateGroups,
}: AttendanceScheduleListProps) {
  return (
    <section className="space-y-4">
      <h2 className="sticky top-[7.5rem] z-10 border-b border-dojo-border bg-dojo-black/95 py-2 text-sm font-semibold uppercase tracking-wide text-dojo-red backdrop-blur">
        {monthLabel}
      </h2>
      <div className="space-y-5">
        {dateGroups.map((group) => (
          <AttendanceScheduleDateGroupSection key={group.dateKey} group={group} />
        ))}
      </div>
    </section>
  );
}
