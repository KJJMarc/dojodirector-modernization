import { getStudentFullName } from "@/lib/attendance";
import { formatScheduleDayLabelSafe } from "@/lib/class-session-schedule";
import type { RecurringScheduleStudentBookingSummary } from "@/lib/admin-session-bookings.shared";

interface RecurringScheduleBookingsTableProps {
  studentBookings: RecurringScheduleStudentBookingSummary[];
}

export function RecurringScheduleBookingsTable({
  studentBookings,
}: RecurringScheduleBookingsTableProps) {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          FUTURE BOOKINGS BY STUDENT
        </h3>
        <p className="mt-1 text-xs text-dojo-muted">
          Active future bookings on this recurring class schedule.
        </p>
      </div>

      {studentBookings.length === 0 ? (
        <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
          No future bookings yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-dojo-border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Future sessions</th>
                <th className="px-4 py-3 font-semibold">Next session</th>
                <th className="px-4 py-3 font-semibold">BOOKING STATUS</th>
              </tr>
            </thead>
            <tbody>
              {studentBookings.map((booking) => {
                const studentName = getStudentFullName(
                  booking.firstName,
                  booking.lastName,
                );
                const bookingStatusLabel =
                  booking.futureBookingCount > 0
                    ? `${booking.futureBookingCount} booked`
                    : "—";

                return (
                  <tr
                    key={booking.userId}
                    className="border-b border-dojo-border/70 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-dojo-white">{studentName}</div>
                      {booking.email ? (
                        <div className="text-xs text-dojo-muted">{booking.email}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-dojo-muted">
                      {booking.futureBookingCount}
                    </td>
                    <td className="px-4 py-3 text-dojo-muted">
                      {formatScheduleDayLabelSafe(booking.nextSessionAt) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-dojo-muted">{bookingStatusLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
