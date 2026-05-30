import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { StudentAttendanceCard } from "@/components/attendance/student-attendance-card";
import { getStudentFullName } from "@/lib/attendance";
import {
  countAttendance,
  formatSessionStartsAt,
} from "@/lib/attendance-ui";
import { ClassSession } from "@/types/database";

interface SessionAttendanceSectionProps {
  session: ClassSession;
  markAttendanceAction: (formData: FormData) => Promise<void>;
  markingDisabled?: boolean;
}

export function SessionAttendanceSection({
  session,
  markAttendanceAction,
  markingDisabled = false,
}: SessionAttendanceSectionProps) {
  const getUser = (users: ClassSession["session_attendees"][number]["users"]) =>
    Array.isArray(users) ? users[0] ?? null : users;

  const counts = countAttendance(session.session_attendees);

  return (
    <section className="overflow-hidden rounded-xl border border-dojo-border bg-dojo-surface">
      <header className="border-b border-dojo-border px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-dojo-white">
              {session.class_name}
            </h2>
            <p className="text-xs text-dojo-muted">
              {formatSessionStartsAt(session.starts_at)}
              {session.location ? ` · ${session.location}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-2">
          <AttendanceSummary counts={counts} compact />
        </div>
      </header>

      <div className="space-y-1 p-2">
        {session.session_attendees.map((attendee) => (
          <StudentAttendanceCard
            key={attendee.id}
            attendeeId={attendee.id}
            userId={attendee.user_id}
            status={attendee.attendance_status}
            studentName={getStudentFullName(
              getUser(attendee.users)?.first_name ?? null,
              getUser(attendee.users)?.last_name ?? null,
            )}
            markAttendanceAction={markAttendanceAction}
            markingDisabled={markingDisabled}
          />
        ))}
      </div>
    </section>
  );
}
