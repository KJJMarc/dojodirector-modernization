"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AttendanceStatusChip } from "@/components/attendance/attendance-status-chip";
import {
  loadInstructorKidsPromotionSessionAction,
  promoteJuniorCandidateAction,
} from "@/app/instructor-portal/(portal)/[clubSlug]/promotion-candidates/actions";
import {
  listKidsPromotionCandidateSessionCards,
  type KidsPromotionCandidateSessionCard,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import type {
  KidsPromotionRegisterAttendee,
  KidsPromotionRegistersViewData,
} from "@/lib/admin-kids-promotion-registers.shared";
import {
  formatPromotionProgressLabel,
  formatPromotionRequiredTimeLabel,
  formatPromotionTimeSinceLabel,
} from "@/lib/admin-belt-promotion.shared";
import { formatAdminAttendanceStatusLabel } from "@/lib/admin-session-bookings.shared";
import type { AttendanceStatus } from "@/types/database";

interface InstructorKidsPromotionCandidatesViewProps {
  data: KidsPromotionRegistersViewData;
  selectedDateKey: string;
}

function resolveAttendanceChipStatus(status: string | null): AttendanceStatus {
  if (status === "present" || status === "absent") {
    return status;
  }

  return null;
}

function SessionAccordionHeader({
  card,
  expanded,
}: {
  card: KidsPromotionCandidateSessionCard;
  expanded: boolean;
}) {
  const { session, dayLabel, dateLabel } = card;

  return (
    <div className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-dojo-muted">
          {dayLabel} · {dateLabel}
        </p>
        <h3 className="text-sm font-semibold text-dojo-white">{session.className}</h3>
        <p className="text-sm text-dojo-muted">
          {session.timeLabel}
          {session.location ? ` · ${session.location}` : ""}
        </p>
        <p className="text-xs text-dojo-muted">
          {session.promotionCandidateCount} promotion candidate
          {session.promotionCandidateCount === 1 ? "" : "s"}
        </p>
      </div>
      <span
        aria-hidden
        className={`mt-1 shrink-0 text-dojo-muted transition-transform ${
          expanded ? "rotate-180" : ""
        }`}
      >
        ▾
      </span>
    </div>
  );
}

export function InstructorKidsPromotionCandidatesView({
  data,
  selectedDateKey,
}: InstructorKidsPromotionCandidatesViewProps) {
  const router = useRouter();
  const sessionCards = useMemo(
    () => listKidsPromotionCandidateSessionCards(data.dateGroups),
    [data.dateGroups],
  );
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadedAttendeesBySessionId, setLoadedAttendeesBySessionId] = useState<
    Map<string, KidsPromotionRegisterAttendee[]>
  >(() => new Map());
  const [loadingSessionIds, setLoadingSessionIds] = useState<Set<string>>(new Set());
  const [sessionLoadErrors, setSessionLoadErrors] = useState<Map<string, string>>(
    () => new Map(),
  );
  const loadedSessionIdsRef = useRef(new Set<string>());
  const loadingSessionIdsRef = useRef(new Set<string>());
  const [isPending, startTransition] = useTransition();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadSessionAttendees = useCallback(
    async (sessionId: string) => {
      if (
        loadedSessionIdsRef.current.has(sessionId) ||
        loadingSessionIdsRef.current.has(sessionId)
      ) {
        return;
      }

      loadingSessionIdsRef.current.add(sessionId);
      setLoadingSessionIds(new Set(loadingSessionIdsRef.current));
      setSessionLoadErrors((previous) => {
        const next = new Map(previous);
        next.delete(sessionId);
        return next;
      });

      const result = await loadInstructorKidsPromotionSessionAction(
        data.clubSlug,
        sessionId,
      );

      loadingSessionIdsRef.current.delete(sessionId);
      setLoadingSessionIds(new Set(loadingSessionIdsRef.current));

      if (result.status === "success") {
        loadedSessionIdsRef.current.add(sessionId);
        setLoadedAttendeesBySessionId((previous) =>
          new Map(previous).set(sessionId, result.attendees),
        );
      } else {
        setSessionLoadErrors((previous) =>
          new Map(previous).set(sessionId, result.message),
        );
      }
    },
    [data.clubSlug],
  );

  useEffect(() => {
    for (const sessionId of Array.from(expandedSessionIds)) {
      void loadSessionAttendees(sessionId);
    }
  }, [expandedSessionIds, loadSessionAttendees]);

  const visibleCandidateCount = sessionCards.reduce(
    (count, card) => count + card.session.promotionCandidateCount,
    0,
  );

  const toggleSession = (sessionId: string) => {
    setExpandedSessionIds((previous) => {
      const next = new Set(previous);

      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }

      return next;
    });
  };

  const handlePromote = (userId: string, studentName: string, nextBeltLabel: string) => {
    if (isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Promote ${studentName} to ${nextBeltLabel}? This will record today's date as the awarded date.`,
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setPendingUserId(userId);

    const formData = new FormData();
    formData.set("clubSlug", data.clubSlug);
    formData.set("userId", userId);

    startTransition(async () => {
      const result = await promoteJuniorCandidateAction(formData);

      if (result.status === "success") {
        setFeedback({
          type: "success",
          message: `${result.studentName} promoted to ${result.nextBeltLabel}.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: result.message,
        });
      }

      setPendingUserId(null);
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Promotion candidates by class
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Expand a class to review eligible students and promote them.
          </p>
        </div>
        <p className="text-xs text-dojo-muted">
          {visibleCandidateCount} candidate{visibleCandidateCount === 1 ? "" : "s"} across{" "}
          {sessionCards.length} class{sessionCards.length === 1 ? "" : "es"}
        </p>
      </section>

      {feedback ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-green-500/40 bg-green-500/10 text-green-200"
              : "border-dojo-red/40 bg-dojo-red/10 text-dojo-red"
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}

      {sessionCards.length === 0 ? (
        <div className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          No classes scheduled for the selected date.
        </div>
      ) : (
        <div className="space-y-3">
          {sessionCards.map((card) => {
            const expanded = expandedSessionIds.has(card.session.id);
            const isLoadingSession = loadingSessionIds.has(card.session.id);
            const sessionAttendees =
              loadedAttendeesBySessionId.get(card.session.id) ?? [];
            const sessionLoadError = sessionLoadErrors.get(card.session.id);

            return (
              <article
                key={`${selectedDateKey}-${card.session.id}`}
                className="overflow-hidden rounded-lg border border-dojo-border bg-dojo-elevated"
              >
                <button
                  type="button"
                  onClick={() => toggleSession(card.session.id)}
                  aria-expanded={expanded}
                  className="flex w-full px-4 py-4 transition hover:bg-dojo-surface/60 active:bg-dojo-surface/80"
                >
                  <SessionAccordionHeader card={card} expanded={expanded} />
                </button>

                {expanded ? (
                  <div className="border-t border-dojo-border px-4 py-4">
                    {isLoadingSession ? (
                      <div
                        className="flex items-center gap-3 rounded-md border border-dojo-border bg-dojo-surface px-3 py-3 text-sm text-dojo-muted"
                        role="status"
                        aria-live="polite"
                      >
                        <span
                          aria-hidden
                          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-dojo-muted border-t-dojo-red"
                        />
                        Loading promotion candidates…
                      </div>
                    ) : sessionLoadError ? (
                      <div
                        className="space-y-3 rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-3"
                        role="alert"
                      >
                        <p className="text-sm text-dojo-red">{sessionLoadError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            loadedSessionIdsRef.current.delete(card.session.id);
                            setLoadedAttendeesBySessionId((previous) => {
                              const next = new Map(previous);
                              next.delete(card.session.id);
                              return next;
                            });
                            void loadSessionAttendees(card.session.id);
                          }}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-dojo-red/40 px-4 text-sm font-semibold text-dojo-red transition hover:bg-dojo-red/10"
                        >
                          Retry
                        </button>
                      </div>
                    ) : sessionAttendees.length === 0 ? (
                      <p className="rounded-md border border-dojo-border bg-dojo-surface px-3 py-3 text-sm text-dojo-muted">
                        No promotion candidates found for this class.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {sessionAttendees.map((attendee) => {
                          const candidate = attendee.promotionCandidate;

                          if (!candidate || !attendee.userId) {
                            return null;
                          }

                          const isPromoting =
                            isPending && pendingUserId === attendee.userId;

                          return (
                            <li
                              key={attendee.attendeeId}
                              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-dojo-white">
                                      {attendee.fullName}
                                    </span>
                                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                                      Promotion candidate
                                    </span>
                                  </div>

                                  <dl className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <dt className="uppercase tracking-wide text-dojo-muted">
                                        Current belt
                                      </dt>
                                      <dd className="mt-0.5 text-dojo-white">
                                        {candidate.assessment.currentBeltLabel}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="uppercase tracking-wide text-dojo-muted">
                                        Next belt
                                      </dt>
                                      <dd className="mt-0.5 text-dojo-white">
                                        {candidate.assessment.nextBeltLabel}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="uppercase tracking-wide text-dojo-muted">
                                        Attendance
                                      </dt>
                                      <dd className="mt-0.5 tabular-nums text-dojo-white">
                                        {formatPromotionProgressLabel(
                                          candidate.assessment.attendanceSinceAward,
                                          candidate.assessment.requiredAttendance,
                                        )}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="uppercase tracking-wide text-dojo-muted">
                                        Time
                                      </dt>
                                      <dd className="mt-0.5 tabular-nums text-dojo-white">
                                        {formatPromotionTimeSinceLabel(candidate.assessment)} /{" "}
                                        {formatPromotionRequiredTimeLabel(
                                          candidate.assessment,
                                        )}
                                      </dd>
                                    </div>
                                  </dl>

                                  <div className="flex items-center gap-2">
                                    <AttendanceStatusChip
                                      status={resolveAttendanceChipStatus(
                                        attendee.attendanceStatus,
                                      )}
                                    />
                                    <span className="text-xs text-dojo-muted">
                                      {formatAdminAttendanceStatusLabel(
                                        attendee.attendanceStatus,
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    handlePromote(
                                      attendee.userId!,
                                      attendee.fullName,
                                      candidate.assessment.nextBeltLabel,
                                    )
                                  }
                                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center self-start rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isPromoting ? "Promoting…" : "Promote"}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
