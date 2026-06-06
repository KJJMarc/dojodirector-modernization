"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  acceptWaitlistOfferFromStudentPortal,
  bookClassFromStudentPortal,
  declineWaitlistOfferFromStudentPortal,
  joinWaitlistFromStudentPortal,
  leaveWaitlistFromStudentPortal,
} from "@/app/student-portal/[clubSlug]/[userId]/actions";
import { WaitlistOfferActions } from "@/components/student-portal/waitlist-offer-actions";
import {
  formatStudentPortalActionSuccessMessage,
  isStudentPortalBookableSession,
} from "@/lib/student-portal-action-result.shared";
import {
  formatPortalWaitlistCount,
  formatPortalWaitlistPosition,
} from "@/lib/student-portal-format.shared";
import type { StudentPortalActionResult } from "@/lib/student-portal-action-result.shared";
import { WAITLIST_ACCEPT_SUCCESS_MESSAGE } from "@/lib/session-waitlist.shared";
import type {
  StudentPortalBookableSession,
  StudentPortalBookableSessionGroup,
} from "@/lib/student-portal.shared";

interface StudentPortalBookClassProps {
  clubSlug: string;
  userId: string;
  sessionGroups: StudentPortalBookableSessionGroup[];
}

function BookableSessionCard({
  session,
  isPending,
  onBook,
  onJoinWaitlist,
  onLeaveWaitlist,
  onAcceptOffer,
  onDeclineOffer,
}: {
  session: StudentPortalBookableSession;
  isPending: boolean;
  onBook: (classSessionId: string) => void;
  onJoinWaitlist: (classSessionId: string) => void;
  onLeaveWaitlist: (classSessionId: string) => void;
  onAcceptOffer: (classSessionId: string) => void;
  onDeclineOffer: (classSessionId: string) => void;
}) {
  const isBooked = session.memberBookingStatus === "booked";
  const waitlistPositionLabel = formatPortalWaitlistPosition(session.waitlistPosition);
  const waitlistCountLabel = formatPortalWaitlistCount(session.waitlistCount);

  return (
    <article className="rounded-lg border border-dojo-border bg-dojo-elevated p-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h4 className="font-semibold text-dojo-white">
              {session.className ?? "Unnamed class"}
            </h4>
            <p className="text-sm text-dojo-muted">{session.dateLabel}</p>
            <p className="text-sm text-dojo-muted">{session.timeLabel}</p>
            <p className="text-sm text-dojo-muted">{session.locationLabel}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-dojo-muted">
              {session.spacesAvailableLabel}
            </p>
            {waitlistCountLabel ? (
              <p className="mt-1 text-xs text-dojo-muted">{waitlistCountLabel}</p>
            ) : null}
            {session.memberBookingStatusLabel ? (
              <p className="mt-1 text-xs font-semibold text-dojo-white">
                {session.memberBookingStatusLabel}
              </p>
            ) : null}
            {waitlistPositionLabel ? (
              <p className="mt-1 text-xs font-semibold text-dojo-white">
                {waitlistPositionLabel}
              </p>
            ) : null}
          </div>
        </div>

        {isBooked ? (
          <p className="text-sm text-dojo-muted">
            You are already booked for this class.
          </p>
        ) : session.waitlistStatus === "offered" ? (
          <div className="space-y-2 rounded-md border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-3 py-3">
            <p className="text-sm font-semibold text-dojo-white">
              You have a waitlist offer
            </p>
            <WaitlistOfferActions
              expiresAt={session.offerExpiresAt}
              isPending={isPending}
              onAccept={() => onAcceptOffer(session.id)}
              onDecline={() => onDeclineOffer(session.id)}
            />
          </div>
        ) : session.waitlistStatus === "waiting" ? (
          <div className="space-y-2">
            {waitlistPositionLabel ? (
              <p className="text-sm text-dojo-white">{waitlistPositionLabel}</p>
            ) : (
              <p className="text-sm text-dojo-white">You are on the waitlist.</p>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={() => onLeaveWaitlist(session.id)}
              className="min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Leave waitlist
            </button>
          </div>
        ) : session.isFull ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-dojo-muted">Class full</p>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onJoinWaitlist(session.id)}
              className="min-h-[40px] w-full rounded-md bg-dojo-red px-3 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Join waitlist
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onBook(session.id)}
            className="min-h-[40px] w-full rounded-md bg-green-600 px-3 text-sm font-semibold text-white ring-1 ring-green-500 transition hover:bg-green-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Book class
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

  const runAction = (
    action: () => Promise<StudentPortalActionResult | void>,
    successText: string,
  ) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = await action();
        setSuccessMessage(
          formatStudentPortalActionSuccessMessage(successText, result),
        );
        router.refresh();
      } catch (error) {
        setSuccessMessage(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We could not complete your request. Please try again.",
        );
      }
    });
  };

  const handleBookSession = (classSessionId: string) => {
    runAction(
      () => bookClassFromStudentPortal(clubSlug, userId, classSessionId),
      "You are booked for [class].",
    );
  };

  const handleJoinWaitlist = (classSessionId: string) => {
    runAction(
      () => joinWaitlistFromStudentPortal(clubSlug, userId, classSessionId),
      "You have joined the waitlist for [class].",
    );
  };

  const handleLeaveWaitlist = (classSessionId: string) => {
    runAction(
      () => leaveWaitlistFromStudentPortal(clubSlug, userId, classSessionId),
      "You have left the waitlist for [class].",
    );
  };

  const handleAcceptOffer = (classSessionId: string) => {
    runAction(
      () => acceptWaitlistOfferFromStudentPortal(clubSlug, userId, classSessionId),
      WAITLIST_ACCEPT_SUCCESS_MESSAGE,
    );
  };

  const handleDeclineOffer = (classSessionId: string) => {
    runAction(
      () => declineWaitlistOfferFromStudentPortal(clubSlug, userId, classSessionId),
      "You declined the waitlist offer for [class].",
    );
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
            {group.sessions.filter(isStudentPortalBookableSession).map((session) => (
              <li key={session.id}>
                <BookableSessionCard
                  session={session}
                  isPending={isPending}
                  onBook={handleBookSession}
                  onJoinWaitlist={handleJoinWaitlist}
                  onLeaveWaitlist={handleLeaveWaitlist}
                  onAcceptOffer={handleAcceptOffer}
                  onDeclineOffer={handleDeclineOffer}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
