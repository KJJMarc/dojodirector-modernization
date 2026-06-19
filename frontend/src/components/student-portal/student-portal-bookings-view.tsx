"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelClassBookingFromStudentPortal } from "@/app/student-portal/[clubSlug]/[userId]/actions";
import { resolveStudentPortalActionClassName } from "@/lib/student-portal-action-result.shared";
import type { StudentPortalBookingsPageData } from "@/lib/student-portal.shared";

const CANCEL_BOOKING_BUTTON_CLASS =
  "inline-flex min-h-[32px] items-center justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-green-500 transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60";

interface StudentPortalBookingsViewProps {
  clubSlug: string;
  userId: string;
  pageData: StudentPortalBookingsPageData;
}

export function StudentPortalBookingsView({
  clubSlug,
  userId,
  pageData,
}: StudentPortalBookingsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCancelBooking = (classSessionId: string, className: string) => {
    const confirmed = window.confirm(
      `Cancel your booking for ${className}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = await cancelClassBookingFromStudentPortal(
          clubSlug,
          userId,
          classSessionId,
        );
        setSuccessMessage(
          `Your booking for ${resolveStudentPortalActionClassName(result)} has been cancelled.`,
        );
        router.refresh();
      } catch (error) {
        setSuccessMessage(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not cancel your booking. Please try again.",
        );
      }
    });
  };

  return (
    <section
      className={`space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4 ${
        isPending ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          MANAGE BOOKINGS
        </h2>
        <p className="mt-1 text-xs text-dojo-muted">
          Your future booked class sessions.
        </p>
      </div>

      {successMessage ? (
        <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-dojo-white">
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {errorMessage}
        </p>
      ) : null}

      {pageData.upcomingBookings.length === 0 ? (
        <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-5 text-center text-sm text-dojo-muted">
          You have no upcoming bookings.
        </p>
      ) : (
        <ul className="space-y-2">
          {pageData.upcomingBookings.map((booking) => (
            <li
              key={booking.id}
              className="rounded-lg border border-dojo-border bg-dojo-elevated p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="text-base font-semibold leading-snug text-dojo-white">
                    {booking.className}
                  </h4>
                  <p className="text-sm leading-snug text-dojo-muted">
                    {booking.dateLabel} · {booking.timeLabel}
                  </p>
                  <p className="text-sm leading-snug text-dojo-muted">
                    {booking.locationLabel}
                  </p>
                </div>

                <div className="flex shrink-0 flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                  <span className="rounded-full border border-dojo-border bg-dojo-surface px-2.5 py-0.5 text-xs font-semibold text-dojo-white">
                    {booking.bookingStatus}
                  </span>

                  {booking.canCancelBooking ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handleCancelBooking(booking.classSessionId, booking.className)
                      }
                      className={CANCEL_BOOKING_BUTTON_CLASS}
                    >
                      Cancel booking
                    </button>
                  ) : booking.cancelBlockedMessage ? (
                    <p className="max-w-[12rem] text-right text-xs leading-snug text-dojo-muted sm:text-right">
                      {booking.cancelBlockedMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
