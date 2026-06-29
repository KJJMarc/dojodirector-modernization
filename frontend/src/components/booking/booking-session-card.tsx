"use client";

import {
  BookableSession,
  formatSessionLocation,
  formatSpacesAvailable,
} from "@/lib/booking";
import {
  formatScheduleCapacitySummary,
  formatScheduleTimeRange,
} from "@/lib/class-session-schedule";

interface BookingSessionCardProps {
  session: BookableSession;
  onBookSession: (classSessionId: string) => void;
  /** Override primary action label (e.g. guest booking flow). */
  sessionActionLabel?: string;
  /** When true, the action button is disabled (e.g. guest booking on a full class). */
  sessionActionDisabled?: boolean;
}

export function BookingSessionCard({
  session,
  onBookSession,
  sessionActionLabel,
  sessionActionDisabled = false,
}: BookingSessionCardProps) {
  const isFull = session.spacesAvailable === 0;
  const actionDisabled = Boolean(sessionActionDisabled);
  const actionLabel =
    sessionActionLabel ??
    (isFull ? "Join waiting list" : "Book class");

  return (
    <article className="rounded-xl border border-dojo-border bg-dojo-surface p-3">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-semibold text-dojo-white">
              {session.className}
            </h3>
            <p className="text-sm text-dojo-muted">
              {formatScheduleTimeRange(
                session.startsAt,
                session.endsAt,
                session.externalId,
              )}
            </p>
            <p className="text-sm text-dojo-muted">
              {formatSessionLocation(session.location)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-dojo-muted">
              {formatScheduleCapacitySummary(session)}
            </p>
            <p className="mt-1 text-xs font-medium text-dojo-white">
              {formatSpacesAvailable(session.spacesAvailable)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBookSession(session.id)}
          disabled={actionDisabled}
          className={`min-h-[40px] w-full rounded-md px-3 text-sm font-semibold transition active:scale-[0.98] ${
            actionDisabled
              ? "cursor-not-allowed bg-dojo-border text-dojo-muted"
              : isFull
                ? "bg-dojo-red text-dojo-white hover:bg-dojo-red-hover"
                : "bg-green-600 text-white ring-1 ring-green-500 hover:bg-green-500"
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </article>
  );
}
