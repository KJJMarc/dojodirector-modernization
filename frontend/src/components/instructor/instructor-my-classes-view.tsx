import { formatProgrammeTypeLabel, formatSessionStatusLabel } from "@/lib/admin-programme-types";
import type { InstructorSessionAllocationRow } from "@/lib/admin-instructors.shared";
import type { InstructorRecurringClassRow } from "@/lib/instructor-portal.shared";

interface InstructorMyClassesViewProps {
  recurringClasses: InstructorRecurringClassRow[];
  upcomingSessions: InstructorSessionAllocationRow[];
}

function SessionStatusBadge({ session }: { session: InstructorSessionAllocationRow }) {
  if (session.isCancelled) {
    return (
      <span className="inline-flex rounded-full bg-dojo-red/15 px-2 py-0.5 text-xs font-semibold text-dojo-red">
        {formatSessionStatusLabel("cancelled")}
      </span>
    );
  }

  if (session.isCompleted) {
    return (
      <span className="inline-flex rounded-full bg-neutral-500/15 px-2 py-0.5 text-xs font-semibold text-neutral-300">
        {formatSessionStatusLabel("completed")}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
      {formatSessionStatusLabel("scheduled")}
    </span>
  );
}

export function InstructorMyClassesView({
  recurringClasses,
  upcomingSessions,
}: InstructorMyClassesViewProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Recurring classes
        </h2>
        {recurringClasses.length === 0 ? (
          <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-6 text-center text-sm text-dojo-muted">
            No recurring classes assigned.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-3 py-2 font-semibold">Class</th>
                  <th className="px-3 py-2 font-semibold">Programme</th>
                  <th className="px-3 py-2 font-semibold">Day</th>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Venue</th>
                </tr>
              </thead>
              <tbody>
                {recurringClasses.map((classRow) => (
                  <tr
                    key={classRow.scheduleId}
                    className="border-b border-dojo-border/70 last:border-b-0"
                  >
                    <td className="px-3 py-2 font-medium text-dojo-white">
                      {classRow.className}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                      {formatProgrammeTypeLabel(classRow.programmeType)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                      {classRow.dayLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                      {classRow.timeLabel}
                    </td>
                    <td className="px-3 py-2 text-dojo-muted">{classRow.locationLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Upcoming sessions
        </h2>
        {upcomingSessions.length === 0 ? (
          <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-6 text-center text-sm text-dojo-muted">
            No upcoming sessions assigned in the next 8 weeks.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Class</th>
                  <th className="px-3 py-2 font-semibold">Programme</th>
                  <th className="px-3 py-2 font-semibold">Venue</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSessions.map((session) => (
                  <tr
                    key={session.sessionId}
                    className={`border-b border-dojo-border/70 last:border-b-0 ${
                      session.isCancelled ? "opacity-75" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                      {session.dateLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                      {session.timeLabel}
                    </td>
                    <td className="px-3 py-2 font-medium text-dojo-white">
                      {session.className}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-dojo-muted">
                      {formatProgrammeTypeLabel(session.programmeType)}
                    </td>
                    <td className="px-3 py-2 text-dojo-muted">{session.locationLabel}</td>
                    <td className="px-3 py-2">
                      <SessionStatusBadge session={session} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
