import { getStudentFullName } from "@/lib/attendance";
import {
  formatDayOfWeekLabel,
  formatProgrammeTypeLabel,
  formatScheduleTimeLabelSafe,
} from "@/lib/admin-recurring-classes.shared";
import type { RecurringScheduleBookingsPageData } from "@/lib/admin-session-bookings.shared";

interface RecurringScheduleBookingsSummaryProps {
  pageData: RecurringScheduleBookingsPageData;
}

export function RecurringScheduleBookingsSummary({
  pageData,
}: RecurringScheduleBookingsSummaryProps) {
  const { schedule, studentBookings, sessionHealth } = pageData;

  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">{schedule.className}</h2>
          <p className="mt-1 text-sm text-dojo-muted">
            {formatDayOfWeekLabel(schedule.dayOfWeek)} ·{" "}
            {formatScheduleTimeLabelSafe(schedule.startTime)} –{" "}
            {formatScheduleTimeLabelSafe(schedule.endTime)}
          </p>
          <p className="mt-1 text-sm text-dojo-muted">
            {formatProgrammeTypeLabel(schedule.programmeType)} · {schedule.location}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            schedule.isActive
              ? "bg-green-500/15 text-green-400"
              : "bg-neutral-500/15 text-neutral-400"
          }`}
        >
          {schedule.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Capacity
          </dt>
          <dd className="mt-1 text-sm text-dojo-white">{schedule.capacity}</dd>
        </div>
        <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Venue
          </dt>
          <dd className="mt-1 text-sm text-dojo-white">{schedule.location}</dd>
        </div>
        <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Future sessions
          </dt>
          <dd className="mt-1 text-sm text-dojo-white">
            {sessionHealth.futureSessionCount}
            {sessionHealth.futureSessionCount < sessionHealth.requiredSessionCount
              ? ` of ${sessionHealth.requiredSessionCount}`
              : ""}
          </dd>
        </div>
        <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Students booked
          </dt>
          <dd className="mt-1 text-sm text-dojo-white">{studentBookings.length}</dd>
        </div>
      </dl>

      {sessionHealth.warning ? (
        <p className="rounded-md border border-amber-700/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {sessionHealth.warning} Bookings can still be made for sessions that are already
          scheduled.
        </p>
      ) : null}
    </section>
  );
}
