import Link from "next/link";
import { GuestBookingRowActions } from "@/components/admin/guest-booking-row-actions";
import {
  formatAdminGuestBookingDateTime,
  guestBookingAgreementPdfHref,
} from "@/lib/admin-guest-bookings.shared";
import { formatGuestBookingStatusLabel } from "@/lib/guest-booking.shared";
import type { AdminGuestBookingRow } from "@/lib/guest-booking.shared";

interface GuestBookingsTableProps {
  clubSlug: string;
  bookings: AdminGuestBookingRow[];
}

export function GuestBookingsTable({ clubSlug, bookings }: GuestBookingsTableProps) {
  if (bookings.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No guest bookings found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-dojo-border text-xs uppercase tracking-wide text-dojo-muted">
          <tr>
            <th className="px-3 py-3 font-semibold">Date booked</th>
            <th className="px-3 py-3 font-semibold">Class date</th>
            <th className="px-3 py-3 font-semibold">Class</th>
            <th className="px-3 py-3 font-semibold">Guest</th>
            <th className="px-3 py-3 font-semibold">Email</th>
            <th className="px-3 py-3 font-semibold">Phone</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Agreement</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dojo-border">
          {bookings.map((booking) => (
            <tr key={booking.id} className="text-dojo-white">
              <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                {formatAdminGuestBookingDateTime(booking.createdAt)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                {formatAdminGuestBookingDateTime(booking.sessionStartsAt)}
              </td>
              <td className="px-3 py-3">{booking.className}</td>
              <td className="px-3 py-3 font-medium">{booking.guestName}</td>
              <td className="px-3 py-3 text-dojo-muted">{booking.email}</td>
              <td className="px-3 py-3 text-dojo-muted">{booking.phone ?? "—"}</td>
              <td className="px-3 py-3">
                {formatGuestBookingStatusLabel(booking.bookingStatus)}
              </td>
              <td className="px-3 py-3">
                {booking.agreementPdfPath ? (
                  <Link
                    href={guestBookingAgreementPdfHref(clubSlug, booking.id)}
                    className="text-sm font-medium text-dojo-red transition hover:text-dojo-white"
                  >
                    Download PDF
                  </Link>
                ) : (
                  <span className="text-dojo-muted">—</span>
                )}
              </td>
              <td className="w-[1%] whitespace-nowrap px-3 py-3">
                <GuestBookingRowActions
                  clubSlug={clubSlug}
                  bookingId={booking.id}
                  guestName={booking.guestName}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
