import { formatClassTime, getStudentFullName } from "@/lib/attendance";
import { ClassSession } from "@/types/database";
import { StudentAttendanceCard } from "@/components/attendance/student-attendance-card";

interface SessionAttendanceSectionProps {
  session: ClassSession;
  markAttendanceAction: (formData: FormData) => Promise<void>;
}

export function SessionAttendanceSection({
  session,
  markAttendanceAction,
}: SessionAttendanceSectionProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            {session.class_name}
          </h2>
          <p className="text-sm text-slate-300">
            {formatClassTime(session.starts_at)}
            {session.location ? ` · ${session.location}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
          {session.session_attendees.length} booked
        </span>
      </header>

      <div className="space-y-3">
        {session.session_attendees.map((attendee) => (
          <StudentAttendanceCard
            key={attendee.id}
            attendeeId={attendee.id}
            status={attendee.attendance_status}
            studentName={getStudentFullName(
              attendee.students?.first_name ?? null,
              attendee.students?.last_name ?? null,
            )}
            markAttendanceAction={markAttendanceAction}
          />
        ))}
      </div>
    </section>
  );
}
