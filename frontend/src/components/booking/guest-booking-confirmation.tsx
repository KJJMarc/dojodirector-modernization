"use client";

import type { GuestBookingResult } from "@/lib/guest-booking.shared";
import { formatSessionLocation } from "@/lib/booking";

interface GuestBookingConfirmationProps {
  result: GuestBookingResult;
  onBookAnother: () => void;
}

export function GuestBookingConfirmation({
  result,
  onBookAnother,
}: GuestBookingConfirmationProps) {
  return (
    <section
      className="rounded-xl border border-green-700/50 bg-green-950/30 p-5"
      aria-live="polite"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-dojo-white">Booking confirmed</h2>
          <p className="mt-2 text-sm text-dojo-muted">
            Your guest booking has been received. We look forward to seeing you at class.
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-dojo-muted">Class</dt>
            <dd className="font-semibold text-dojo-white">{result.className}</dd>
          </div>
          <div>
            <dt className="text-dojo-muted">Date</dt>
            <dd className="text-dojo-white">{result.dateLabel}</dd>
          </div>
          <div>
            <dt className="text-dojo-muted">Time</dt>
            <dd className="text-dojo-white">{result.timeLabel}</dd>
          </div>
          <div>
            <dt className="text-dojo-muted">Location</dt>
            <dd className="text-dojo-white">
              {formatSessionLocation(result.location)}
            </dd>
          </div>
          <div>
            <dt className="text-dojo-muted">Guest</dt>
            <dd className="text-dojo-white">{result.guestName}</dd>
          </div>
          <div>
            <dt className="text-dojo-muted">Email</dt>
            <dd className="text-dojo-white">{result.email}</dd>
          </div>
          {result.phone ? (
            <div>
              <dt className="text-dojo-muted">Phone</dt>
              <dd className="text-dojo-white">{result.phone}</dd>
            </div>
          ) : null}
        </dl>

        <button
          type="button"
          onClick={onBookAnother}
          className="min-h-[40px] w-full rounded-md bg-green-600 px-3 text-sm font-semibold text-white transition hover:bg-green-500 active:scale-[0.98]"
        >
          Book another class
        </button>
      </div>
    </section>
  );
}
