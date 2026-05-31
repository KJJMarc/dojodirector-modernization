import Link from "next/link";
import {
  formatPromotionProgressLabel,
  formatPromotionRequiredTimeLabel,
  formatPromotionTimeSinceLabel,
} from "@/lib/admin-belt-promotion.shared";
import type { PromotionCandidate } from "@/lib/admin-belt-promotion.shared";
import { clubAdminPath } from "@/lib/clubs.shared";

interface PromotionCandidatesListProps {
  clubSlug: string;
  candidates: PromotionCandidate[];
  totalCount: number;
  searchQuery?: string;
}

function ActionButton({
  href,
  label,
  variant = "default",
}: {
  href: string;
  label: string;
  variant?: "default" | "secondary";
}) {
  const className =
    variant === "secondary"
      ? "inline-flex min-h-[32px] items-center justify-center whitespace-nowrap rounded-md border border-dojo-border bg-dojo-elevated px-2 py-1 text-[11px] font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red sm:min-h-[36px] sm:px-3 sm:py-1.5 sm:text-xs"
      : "inline-flex min-h-[32px] items-center justify-center whitespace-nowrap rounded-md bg-dojo-red px-2 py-1 text-[11px] font-semibold text-dojo-white transition hover:bg-dojo-red-hover sm:min-h-[36px] sm:px-3 sm:py-1.5 sm:text-xs";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function PromotionCandidatesList({
  clubSlug,
  candidates,
  totalCount,
  searchQuery,
}: PromotionCandidatesListProps) {
  const countLabel =
    searchQuery && candidates.length !== totalCount
      ? `${candidates.length} of ${totalCount} promotion candidates`
      : `${totalCount} promotion candidate${totalCount === 1 ? "" : "s"}`;

  return (
    <section aria-label="Promotion candidates" className="space-y-3">
      <p className="text-sm text-dojo-muted">{countLabel}</p>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          {searchQuery
            ? "No promotion candidates match your search."
            : "No students currently meet promotion requirements."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface lg:block">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b border-dojo-border bg-dojo-elevated text-[10px] uppercase tracking-wide text-dojo-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Current belt</th>
                  <th className="px-4 py-3 font-semibold">Suggested next belt</th>
                  <th className="px-4 py-3 font-semibold">Attendance since level</th>
                  <th className="px-4 py-3 font-semibold">Required attendance</th>
                  <th className="px-4 py-3 font-semibold">Time since level</th>
                  <th className="px-4 py-3 font-semibold">Required time</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dojo-border">
                {candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-dojo-white">
                        {candidate.fullName}
                      </div>
                      {candidate.email ? (
                        <div className="text-xs text-dojo-muted">{candidate.email}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-dojo-white">
                      {candidate.assessment.currentBeltLabel}
                    </td>
                    <td className="px-4 py-3 text-dojo-white">
                      {candidate.assessment.nextBeltLabel}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-dojo-white">
                      {formatPromotionProgressLabel(
                        candidate.assessment.attendanceSinceAward,
                        candidate.assessment.requiredAttendance,
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-dojo-white">
                      {candidate.assessment.requiredAttendance}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-dojo-white">
                      {formatPromotionTimeSinceLabel(candidate.assessment)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-dojo-white">
                      {formatPromotionRequiredTimeLabel(candidate.assessment)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <ActionButton
                        href={clubAdminPath(
                          clubSlug,
                          `students/${candidate.id}/change-belt`,
                        )}
                        label="Change Belt Level"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {candidates.map((candidate) => (
              <li
                key={candidate.id}
                className="rounded-xl border border-dojo-border bg-dojo-surface p-4"
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-base font-semibold text-dojo-white">
                      {candidate.fullName}
                    </p>
                    {candidate.email ? (
                      <p className="text-sm text-dojo-muted">{candidate.email}</p>
                    ) : null}
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

                  <ActionButton
                    href={clubAdminPath(
                      clubSlug,
                      `students/${candidate.id}/change-belt`,
                    )}
                    label="Change Belt Level"
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
