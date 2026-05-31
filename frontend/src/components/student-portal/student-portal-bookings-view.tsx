import type { StudentPortalBookingsPageData } from "@/lib/student-portal.shared";

interface StudentPortalBookingsViewProps {
  pageData: StudentPortalBookingsPageData;
}

export function StudentPortalBookingsView({
  pageData,
}: StudentPortalBookingsViewProps) {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          UPCOMING BOOKINGS
        </h2>
        <p className="mt-1 text-xs text-dojo-muted">
          Your future booked and waitlisted class sessions.
        </p>
      </div>

      {pageData.upcomingBookings.length === 0 ? (
        <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-6 text-center text-sm text-dojo-muted">
          You have no upcoming bookings.
        </p>
      ) : (
        <ul className="space-y-3">
          {pageData.upcomingBookings.map((booking) => (
            <li
              key={booking.id}
              className="rounded-lg border border-dojo-border bg-dojo-elevated p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h4 className="font-semibold text-dojo-white">{booking.className}</h4>
                  <p className="text-sm text-dojo-muted">{booking.dateLabel}</p>
                  <p className="text-sm text-dojo-muted">{booking.timeLabel}</p>
                  {booking.instructorName ? (
                    <p className="text-sm text-dojo-muted">
                      Instructor: {booking.instructorName}
                    </p>
                  ) : (
                    <p className="text-sm text-dojo-muted">Instructor: TBC</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-dojo-border bg-dojo-surface px-2 py-0.5 text-xs font-semibold text-dojo-white">
                  {booking.bookingStatus}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
