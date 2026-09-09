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
      className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
      aria-live="polite"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Booking confirmed</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Your guest booking has been received. We look forward to seeing you at class.
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-neutral-500">Class</dt>
            <dd className="font-semibold text-neutral-900">{result.className}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Date</dt>
            <dd className="text-neutral-900">{result.dateLabel}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Time</dt>
            <dd className="text-neutral-900">{result.timeLabel}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Location</dt>
            <dd className="text-neutral-900">
              {formatSessionLocation(result.location)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Guest</dt>
            <dd className="text-neutral-900">{result.guestName}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Email</dt>
            <dd className="text-neutral-900">{result.email}</dd>
          </div>
          {result.phone ? (
            <div>
              <dt className="text-neutral-500">Phone</dt>
              <dd className="text-neutral-900">{result.phone}</dd>
            </div>
          ) : null}
        </dl>

        <button
          type="button"
          onClick={onBookAnother}
          className="min-h-[40px] w-full rounded-md bg-dojo-red px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-dojo-red-hover active:scale-[0.98]"
        >
          Book another class
        </button>
      </div>
    </section>
  );
}
