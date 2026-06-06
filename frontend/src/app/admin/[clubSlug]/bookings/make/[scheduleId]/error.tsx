"use client";

import { useEffect } from "react";

export default function MakeBookingsScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MakeBookingsSchedulePage] Route error boundary", error);
  }, [error]);

  return (
    <section className="mx-auto max-w-4xl space-y-4 px-3 py-8 sm:px-5">
      <div className="rounded-xl border border-dojo-red/40 bg-dojo-red/10 p-4">
        <h2 className="text-lg font-semibold text-dojo-white">
          Unable to load recurring bookings
        </h2>
        <p className="mt-2 text-sm text-dojo-muted">
          Something went wrong while loading this recurring class booking page. Please try
          again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
