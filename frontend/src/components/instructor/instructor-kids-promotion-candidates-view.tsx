"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AttendanceStatusChip } from "@/components/attendance/attendance-status-chip";
import { promoteJuniorCandidateAction } from "@/app/instructor-portal/(portal)/[clubSlug]/promotion-candidates/actions";
import {
  filterKidsPromotionRegisterDateGroups,
  type KidsPromotionRegistersViewData,
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
}

function resolveAttendanceChipStatus(status: string | null): AttendanceStatus {
  if (status === "present" || status === "absent") {
    return status;
  }

  return null;
}

export function InstructorKidsPromotionCandidatesView({
  data,
}: InstructorKidsPromotionCandidatesViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const dateGroups = filterKidsPromotionRegisterDateGroups(data.dateGroups, "candidates");
  const visibleSessionCount = dateGroups.reduce(
    (count, group) => count + group.sessions.length,
    0,
  );
  const visibleCandidateCount = dateGroups.reduce(
    (count, group) =>
      count +
      group.sessions.reduce(
        (sessionCount, session) => sessionCount + session.promotionCandidateCount,
        0,
      ),
    0,
  );

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
      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Today&apos;s promotion candidates
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Booked junior students who meet promotion requirements, grouped by class
            session. Today&apos;s classes are shown first.
          </p>
        </div>
        <p className="text-xs text-dojo-muted">
          {visibleCandidateCount} candidate{visibleCandidateCount === 1 ? "" : "s"} across{" "}
          {visibleSessionCount} class{visibleSessionCount === 1 ? "" : "es"}
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

      {dateGroups.length === 0 ? (
        <div className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          No upcoming classes have booked promotion candidates.
        </div>
      ) : (
        dateGroups.map((group) => (
          <section
            key={group.dateKey}
            className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4"
          >
            <div>
              <h3 className="text-base font-semibold text-dojo-white">{group.dayLabel}</h3>
              <p className="text-sm text-dojo-muted">{group.dateLabel}</p>
            </div>

            <div className="space-y-4">
              {group.sessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-lg border border-dojo-border bg-dojo-elevated p-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-dojo-white">
                      {session.className}
                    </h4>
                    <p className="mt-1 text-sm text-dojo-muted">
                      {session.timeLabel}
                      {session.location ? ` · ${session.location}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-dojo-muted">
                      {session.promotionCandidateCount} promotion candidate
                      {session.promotionCandidateCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {session.attendees.map((attendee) => {
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
                                    {formatPromotionRequiredTimeLabel(candidate.assessment)}
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
                              className="inline-flex min-h-[36px] shrink-0 items-center justify-center self-start rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPromoting ? "Promoting…" : "Promote"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
