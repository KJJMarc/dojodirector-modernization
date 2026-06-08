"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelManageBookingAction } from "@/app/admin/[clubSlug]/bookings/cancel/actions";
import { getStudentFullName } from "@/lib/attendance";
import type { AdminSessionBookingsView } from "@/lib/admin-session-bookings.shared";
import { formatAdminBookingStatusLabel } from "@/lib/admin-session-bookings.shared";

const cancelBookingButtonClassName =
  "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60";

interface CancelSessionBookingsManagerProps {
  clubSlug: string;
  pageData: AdminSessionBookingsView;
}

export function CancelSessionBookingsManager({
  clubSlug,
  pageData,
}: CancelSessionBookingsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { session, attendees } = pageData;
  const totalBookings = attendees.length;

  const submitCancelBooking = (
    attendeeId: string,
    userId: string | null,
    studentName: string,
    isGuest: boolean,
  ) => {
    const confirmed = window.confirm(
      `Cancel booking for ${studentName}? This removes them from the session booking list.`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("attendeeId", attendeeId);
    formData.set("sessionId", session.id);
    if (userId) {
      formData.set("userId", userId);
    }

    startTransition(async () => {
      try {
        await cancelManageBookingAction(formData);
        setMessage(`Booking cancelled for ${studentName}.`);
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to cancel booking.",
        );
      }
    });
  };

  return (
    <div className={`space-y-6 ${isPending ? "pointer-events-none opacity-60" : ""}`}>
      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h2 className="text-lg font-semibold text-dojo-white">{session.className}</h2>
        <p className="mt-1 text-sm text-dojo-muted">{session.dateLabel}</p>
        <p className="text-sm text-dojo-muted">
          {session.timeLabel} · {session.locationLabel}
        </p>
        <p className="mt-2 text-sm font-medium text-dojo-white">
          Total bookings: {totalBookings}
        </p>
      </section>

      {message ? (
        <p className="rounded-md border border-green-700/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {error}
        </p>
      ) : null}

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            BOOKED ATTENDEES
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Cancel a booking to remove the student or guest from this session.
          </p>
        </div>

        {attendees.length === 0 ? (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
            No active bookings for this session.
          </p>
        ) : (
          <ul className="space-y-3">
            {attendees.map((attendee) => {
              const studentName = getStudentFullName(
                attendee.firstName,
                attendee.lastName,
              );

              return (
                <li
                  key={attendee.id}
                  className="flex flex-col gap-3 rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-dojo-white">
                      {studentName}
                      {attendee.isGuest ? (
                        <span className="ml-2 rounded bg-dojo-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dojo-muted">
                          Guest
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-dojo-muted">
                      {attendee.email ?? "No email on file"}
                    </p>
                    <p className="mt-1 text-xs text-dojo-muted">
                      {formatAdminBookingStatusLabel(attendee.bookingStatus)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      submitCancelBooking(
                        attendee.id,
                        attendee.userId,
                        studentName,
                        attendee.isGuest,
                      )
                    }
                    className={cancelBookingButtonClassName}
                  >
                    Cancel Booking
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
