"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bookClassFromStudentPortal } from "@/app/student-portal/[clubSlug]/[userId]/actions";
import type {
  StudentPortalBookableSession,
  StudentPortalBookableSessionGroup,
} from "@/lib/student-portal.shared";

interface StudentPortalBookClassProps {
  clubSlug: string;
  userId: string;
  sessionGroups: StudentPortalBookableSessionGroup[];
}

function formatBookingSuccessMessage(
  outcome: "confirmed" | "waitlisted",
  className: string,
) {
  if (outcome === "waitlisted") {
    return `You have been added to the waiting list for ${className}.`;
  }

  return `You are booked for ${className}.`;
}

function BookableSessionCard({
  session,
  isPending,
  onBook,
}: {
  session: StudentPortalBookableSession;
  isPending: boolean;
  onBook: (classSessionId: string) => void;
}) {
  const hasExistingBooking =
    session.memberBookingStatus === "booked" ||
    session.memberBookingStatus === "waitlisted";

  return (
    <article className="rounded-lg border border-dojo-border bg-dojo-elevated p-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h4 className="font-semibold text-dojo-white">{session.className}</h4>
            <p className="text-sm text-dojo-muted">{session.dateLabel}</p>
            <p className="text-sm text-dojo-muted">{session.timeLabel}</p>
            <p className="text-sm text-dojo-muted">{session.locationLabel}</p>
            {session.instructorName ? (
              <p className="text-sm text-dojo-muted">
                Instructor: {session.instructorName}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-dojo-muted">
              {session.spacesAvailableLabel}
            </p>
            {session.memberBookingStatusLabel ? (
              <p className="mt-1 text-xs font-semibold text-dojo-white">
                {session.memberBookingStatusLabel}
              </p>
            ) : null}
          </div>
        </div>

        {hasExistingBooking ? (
          <p className="text-sm text-dojo-muted">
            {session.memberBookingStatus === "booked"
              ? "You are already booked for this class."
              : "You are already on the waiting list for this class."}
          </p>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onBook(session.id)}
            className={`min-h-[40px] w-full rounded-md px-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
              session.isFull
                ? "bg-dojo-red text-dojo-white hover:bg-dojo-red-hover"
                : "bg-green-600 text-white ring-1 ring-green-500 hover:bg-green-500"
            }`}
          >
            {session.isFull ? "Join Waiting List" : "Book a Class"}
          </button>
        )}
      </div>
    </article>
  );
}

export function StudentPortalBookClass({
  clubSlug,
  userId,
  sessionGroups,
}: StudentPortalBookClassProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleBookSession = (classSessionId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = await bookClassFromStudentPortal(
          clubSlug,
          userId,
          classSessionId,
        );
        setSuccessMessage(
          formatBookingSuccessMessage(result.outcome, result.className),
        );
        router.refresh();
      } catch (error) {
        setSuccessMessage(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not complete your booking. Please try again.",
        );
      }
    });
  };

  if (sessionGroups.length === 0) {
    return (
      <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-6 text-center text-sm text-dojo-muted">
        No classes are scheduled in the next two weeks.
      </p>
    );
  }

  return (
    <div
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
    >
      {successMessage ? (
        <section className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-dojo-white">
          {successMessage}
        </section>
      ) : null}

      {errorMessage ? (
        <section className="rounded-xl border border-dojo-red/40 bg-dojo-red/10 px-4 py-3 text-sm text-dojo-white">
          {errorMessage}
        </section>
      ) : null}

      {sessionGroups.map((group) => (
        <section key={group.dateKey} className="space-y-3">
          <div className="space-y-0.5 border-b border-dojo-border pb-2">
            <h4 className="text-sm font-semibold text-dojo-white">
              {group.dateLabel}
            </h4>
            <p className="text-xs text-dojo-muted">{group.dayLabel}</p>
          </div>
          <ul className="space-y-3">
            {group.sessions.map((session) => (
              <li key={session.id}>
                <BookableSessionCard
                  session={session}
                  isPending={isPending}
                  onBook={handleBookSession}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
