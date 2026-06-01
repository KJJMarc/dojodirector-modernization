import type { ReactNode } from "react";
import Link from "next/link";
import type { AdminClassMetricsPageData } from "@/lib/admin-class-metrics.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import { formatBookingDate } from "@/lib/booking";

interface ClassMetricsViewProps {
  clubSlug: string;
  data: AdminClassMetricsPageData;
}

function MetricsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-dojo-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
      {message}
    </p>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-dojo-white">{value}</p>
    </div>
  );
}

function utilisationLabel(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export function ClassMetricsView({ clubSlug, data }: ClassMetricsViewProps) {
  if (!data.hasSessionData) {
    return (
      <EmptyState message="No class session data found for this reporting period." />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-dojo-muted">{data.periodLabel}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total no-shows" value={data.totalNoShows} />
        <SummaryCard label="Tracked class slots" value={data.trackedClassSlots} />
        <SummaryCard
          label="Frequent no-shows"
          value={data.noShowStudents.filter((row) => row.isRepeatOffender).length}
        />
      </div>

      <MetricsSection
        title="Most popular classes"
        description="Ranked by total bookings in the reporting period. Utilisation compares bookings to combined session capacity."
      >
        {data.popularClasses.length === 0 ? (
          <EmptyState message="No class bookings recorded in this period." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-3 py-2.5 font-semibold">#</th>
                  <th className="px-3 py-2.5 font-semibold">Class</th>
                  <th className="px-3 py-2.5 font-semibold">Day</th>
                  <th className="px-3 py-2.5 font-semibold">Time</th>
                  <th className="px-3 py-2.5 font-semibold">Location</th>
                  <th className="px-3 py-2.5 font-semibold">Instructor</th>
                  <th className="px-3 py-2.5 font-semibold">Bookings</th>
                  <th className="px-3 py-2.5 font-semibold">Attendance</th>
                  <th className="px-3 py-2.5 font-semibold">Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {data.popularClasses.map((row) => (
                  <tr
                    key={row.scheduleLabel}
                    className="border-b border-dojo-border/70 last:border-b-0"
                  >
                    <td className="px-3 py-3 text-dojo-muted">{row.rank}</td>
                    <td className="px-3 py-3 font-medium text-dojo-white">
                      {row.className}
                    </td>
                    <td className="px-3 py-3 text-dojo-muted">{row.dayLabel}</td>
                    <td className="px-3 py-3 text-dojo-muted">{row.timeLabel}</td>
                    <td className="px-3 py-3 text-dojo-muted">{row.locationLabel}</td>
                    <td className="px-3 py-3 text-dojo-muted">{row.instructorLabel}</td>
                    <td className="px-3 py-3 tabular-nums text-dojo-white">
                      {row.totalBookings}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-dojo-white">
                      {row.attendanceCount}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-dojo-white">
                      {utilisationLabel(row.utilisationPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MetricsSection>

      <MetricsSection
        title="Instructor metrics"
        description="Instructors ranked by bookings on sessions they are assigned to teach."
      >
        {data.instructorMetrics.length === 0 ? (
          <EmptyState message="No instructor assignment data available for this period." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-3 py-2.5 font-semibold">#</th>
                  <th className="px-3 py-2.5 font-semibold">Instructor</th>
                  <th className="px-3 py-2.5 font-semibold">Bookings</th>
                  <th className="px-3 py-2.5 font-semibold">Attendance</th>
                  <th className="px-3 py-2.5 font-semibold">Sessions</th>
                  <th className="px-3 py-2.5 font-semibold">Avg / session</th>
                  <th className="px-3 py-2.5 font-semibold">Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {data.instructorMetrics.map((row) => (
                  <tr
                    key={row.instructorUserId}
                    className="border-b border-dojo-border/70 last:border-b-0"
                  >
                    <td className="px-3 py-3 text-dojo-muted">{row.rank}</td>
                    <td className="px-3 py-3 font-medium text-dojo-white">
                      <Link
                        href={clubAdminPath(clubSlug, "instructors")}
                        className="transition hover:text-dojo-red"
                      >
                        {row.instructorName}
                      </Link>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-dojo-white">
                      {row.totalBookings}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-dojo-white">
                      {row.attendanceCount}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-dojo-muted">
                      {row.sessionsTaught}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-dojo-muted">
                      {row.averageAttendancePerSession ?? "—"}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-dojo-white">
                      {utilisationLabel(row.utilisationPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MetricsSection>

      <MetricsSection
        title="No-show tracking"
        description="Students who booked but were not marked present for a session that has already started."
      >
        {data.noShowStudents.length === 0 ? (
          <EmptyState message="No no-shows recorded in this period." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-3 py-2.5 font-semibold">Student</th>
                  <th className="px-3 py-2.5 font-semibold">Email</th>
                  <th className="px-3 py-2.5 font-semibold">Total</th>
                  <th className="px-3 py-2.5 font-semibold">Recent (30d)</th>
                  <th className="px-3 py-2.5 font-semibold">Last no-show</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.noShowStudents.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-b border-dojo-border/70 last:border-b-0"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={clubAdminPath(clubSlug, `students/${row.userId}/profile`)}
                        className="font-medium text-dojo-white transition hover:text-dojo-red"
                      >
                        {row.studentName}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-dojo-muted">
                      {row.email ?? "—"}
                    </td>
                    <td className="px-3 py-3 tabular-nums font-semibold text-dojo-white">
                      {row.totalNoShows}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-dojo-muted">
                      {row.recentNoShows}
                    </td>
                    <td className="px-3 py-3 text-dojo-muted">
                      {row.lastNoShowDate
                        ? formatBookingDate(row.lastNoShowDate)
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {row.isRepeatOffender ? (
                        <span className="inline-flex rounded-full bg-dojo-red/20 px-2 py-0.5 text-xs font-semibold text-dojo-red">
                          Frequent no-shows
                        </span>
                      ) : (
                        <span className="text-xs text-dojo-muted">Single</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MetricsSection>

      <MetricsSection
        title="Class attendance trends"
        description="Recent patterns to help spot strong sessions, weak attendance, and busy time slots."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendList title="Most attended classes" rows={data.trends.mostAttended} />
          <TrendList title="Least attended classes" rows={data.trends.leastAttended} />
          <TrendList title="Poor utilisation" rows={data.trends.poorUtilisation} />
          <TrendList title="Repeated no-shows by class" rows={data.trends.repeatedNoShows} />
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Popular days and times
          </h3>
          {data.trends.popularDayTimes.length === 0 ? (
            <EmptyState message="No day/time booking patterns yet." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-dojo-border">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                    <th className="px-3 py-2.5 font-semibold">Day</th>
                    <th className="px-3 py-2.5 font-semibold">Time</th>
                    <th className="px-3 py-2.5 font-semibold">Bookings</th>
                    <th className="px-3 py-2.5 font-semibold">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trends.popularDayTimes.map((row) => (
                    <tr
                      key={`${row.dayLabel}-${row.timeLabel}`}
                      className="border-b border-dojo-border/70 last:border-b-0"
                    >
                      <td className="px-3 py-3 text-dojo-white">{row.dayLabel}</td>
                      <td className="px-3 py-3 text-dojo-muted">{row.timeLabel}</td>
                      <td className="px-3 py-3 tabular-nums text-dojo-white">
                        {row.totalBookings}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-dojo-muted">
                        {row.attendanceCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </MetricsSection>
    </div>
  );
}

function TrendList({
  title,
  rows,
}: {
  title: string;
  rows: AdminClassMetricsPageData["trends"]["mostAttended"];
}) {
  return (
    <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-dojo-muted">No data for this view.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li
              key={`${title}-${row.scheduleLabel}-${row.valueLabel}`}
              className="rounded-md border border-dojo-border/70 bg-dojo-surface px-3 py-2"
            >
              <p className="text-sm font-medium text-dojo-white">{row.className}</p>
              <p className="text-xs text-dojo-muted">{row.scheduleLabel}</p>
              <p className="mt-1 text-xs font-semibold text-dojo-red">{row.valueLabel}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
