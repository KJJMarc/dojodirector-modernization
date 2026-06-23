"use client";

import Link from "next/link";
import { AttendanceStatusChip } from "@/components/attendance/attendance-status-chip";
import {
  clubKidsPromotionCandidatesOnRegistersPath,
  filterKidsPromotionRegisterDateGroups,
  kidsPromotionRegisterSessionPdfPath,
  type KidsPromotionRegistersFilter,
  type KidsPromotionRegistersViewData,
} from "@/lib/admin-kids-promotion-registers.shared";
import { formatAdminAttendanceStatusLabel } from "@/lib/admin-session-bookings.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import type { AttendanceStatus } from "@/types/database";

interface KidsPromotionRegistersViewProps {
  data: KidsPromotionRegistersViewData;
  filter: KidsPromotionRegistersFilter;
}

function filterLinkClassName(isActive: boolean) {
  return isActive
    ? "inline-flex min-h-[36px] items-center justify-center rounded-md bg-dojo-red px-3 py-1.5 text-sm font-semibold text-dojo-white"
    : "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";
}

function resolveAttendanceChipStatus(status: string | null): AttendanceStatus {
  if (status === "present" || status === "absent") {
    return status;
  }

  return null;
}

function PdfDownloadLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
    >
      {label}
    </a>
  );
}

export function KidsPromotionRegistersView({
  data,
  filter,
}: KidsPromotionRegistersViewProps) {
  const dateGroups = filterKidsPromotionRegisterDateGroups(data.dateGroups, filter);
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

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Weekly class registers
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Upcoming Kingston Jiu Jitsu Kids BJJ classes for the next eight weeks.
            Booked students are shown with attendance status when marked. Junior
            promotion candidates are highlighted.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href={clubKidsPromotionCandidatesOnRegistersPath(data.clubSlug)}
              className={filterLinkClassName(filter === "all")}
            >
              All booked students
            </Link>
            <Link
              href={`${clubKidsPromotionCandidatesOnRegistersPath(data.clubSlug)}?filter=candidates`}
              className={filterLinkClassName(filter === "candidates")}
            >
              Promotion candidates only
            </Link>
          </div>
          <p className="text-xs text-dojo-muted">
            {data.juniorPromotionCandidateCount} junior promotion candidate
            {data.juniorPromotionCandidateCount === 1 ? "" : "s"} club-wide
            {filter === "candidates"
              ? ` · ${visibleCandidateCount} across ${visibleSessionCount} class${
                  visibleSessionCount === 1 ? "" : "es"
                }`
              : null}
          </p>
        </div>
      </section>

      {dateGroups.length === 0 ? (
        <div className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          {filter === "candidates"
            ? "No upcoming classes have booked promotion candidates."
            : "No upcoming BJJ class sessions found for the next eight weeks."}
        </div>
      ) : (
        dateGroups.map((group) => (
          <section
            key={group.dateKey}
            className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4"
          >
            <div>
              <h3 className="text-base font-semibold text-dojo-white">
                {group.dayLabel}
              </h3>
              <p className="text-sm text-dojo-muted">{group.dateLabel}</p>
            </div>

            <div className="space-y-4">
              {group.sessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-lg border border-dojo-border bg-dojo-elevated p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-dojo-white">
                        {session.className}
                      </h4>
                      <p className="mt-1 text-sm text-dojo-muted">
                        {session.timeLabel}
                        {session.location ? ` · ${session.location}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-dojo-muted">
                        {session.bookedCount} booked
                        {session.promotionCandidateCount > 0
                          ? ` · ${session.promotionCandidateCount} promotion candidate${
                              session.promotionCandidateCount === 1 ? "" : "s"
                            }`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 self-start">
                      <PdfDownloadLink
                        href={kidsPromotionRegisterSessionPdfPath(
                          data.clubSlug,
                          session.id,
                        )}
                        label="Download PDF"
                      />
                      <PdfDownloadLink
                        href={kidsPromotionRegisterSessionPdfPath(
                          data.clubSlug,
                          session.id,
                          "candidates",
                        )}
                        label="Candidates PDF"
                      />
                      <Link
                        href={`/attendance/${session.id}`}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
                      >
                        Open register
                      </Link>
                    </div>
                  </div>

                  {session.attendees.length === 0 ? (
                    <p className="mt-4 text-sm text-dojo-muted">
                      No booked students for this class yet.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {session.attendees.map((attendee) => (
                        <li
                          key={attendee.attendeeId}
                          className={`rounded-md border px-3 py-2 ${
                            attendee.isPromotionCandidate
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-dojo-border bg-dojo-surface"
                          }`}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {attendee.userId ? (
                                  <Link
                                    href={clubAdminPath(
                                      data.clubSlug,
                                      `students/${attendee.userId}/profile`,
                                    )}
                                    className="text-sm font-semibold text-dojo-white transition hover:text-dojo-red"
                                  >
                                    {attendee.fullName}
                                  </Link>
                                ) : (
                                  <span className="text-sm font-semibold text-dojo-white">
                                    {attendee.fullName}
                                  </span>
                                )}
                                {attendee.isPromotionCandidate ? (
                                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                                    Promotion candidate
                                  </span>
                                ) : null}
                              </div>

                              {attendee.promotionCandidate ? (
                                <p className="text-xs text-amber-100/90">
                                  {attendee.promotionCandidate.assessment.currentBeltLabel}
                                  {" → "}
                                  {attendee.promotionCandidate.assessment.nextBeltLabel}
                                </p>
                              ) : null}
                            </div>

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
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
