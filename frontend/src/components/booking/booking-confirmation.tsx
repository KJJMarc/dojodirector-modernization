"use client";

import { BookingResult } from "@/app/book/actions";
import { formatSessionLocation } from "@/lib/booking";

interface BookingConfirmationProps {
  result: BookingResult;
  onBookAnother: () => void;
}

function ConfirmationDetails({ result }: { result: BookingResult }) {
  return (
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
        <dt className="text-dojo-muted">Student</dt>
        <dd className="text-dojo-white">{result.studentName}</dd>
      </div>
      <div>
        <dt className="text-dojo-muted">Email</dt>
        <dd className="text-dojo-white">{result.email}</dd>
      </div>
    </dl>
  );
}

export function BookingConfirmation({
  result,
  onBookAnother,
}: BookingConfirmationProps) {
  const copyByOutcome = {
    confirmed: {
      title: "Booking confirmed",
      message:
        "You are booked onto this class. A confirmation email will be sent later.",
      tone: "border-green-700/50 bg-green-950/30",
    },
    waitlisted: {
      title: "Added to waiting list",
      message:
        "This class is full, so you have been added to the waiting list. A waiting list email will be sent later.",
      tone: "border-dojo-red/40 bg-dojo-red/10",
    },
  } as const;

  const copy = copyByOutcome[result.outcome];

  return (
    <section
      className={`rounded-xl border p-5 ${copy.tone}`}
      aria-live="polite"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-dojo-white">{copy.title}</h2>
          <p className="mt-2 text-sm text-dojo-muted">{copy.message}</p>
        </div>

        <ConfirmationDetails result={result} />

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
