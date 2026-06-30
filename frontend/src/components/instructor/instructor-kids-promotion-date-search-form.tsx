"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildAdjacentKidsPromotionDatePath,
  instructorPortalKidsPromotionCandidatesPath,
  resolveKidsPromotionNavigationDateKey,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import { addLondonCalendarDays, getLondonTodayDateKey } from "@/lib/london-datetime";

interface InstructorKidsPromotionDateSearchFormProps {
  clubSlug: string;
  initialDate?: string;
  initialDays?: number;
  filterHeading?: string | null;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const buttonClassName =
  "inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";

const quickButtonClassName =
  "inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-black px-3 text-xs font-semibold text-dojo-muted transition hover:border-dojo-red/50 hover:text-dojo-white";

export function InstructorKidsPromotionDateSearchForm({
  clubSlug,
  initialDate = "",
  initialDays,
  filterHeading = null,
}: InstructorKidsPromotionDateSearchFormProps) {
  const router = useRouter();
  const [dateValue, setDateValue] = useState(initialDate);

  function navigateTo(href: string) {
    router.push(href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDate = dateValue.trim();

    if (!trimmedDate) {
      navigateTo(instructorPortalKidsPromotionCandidatesPath(clubSlug));
      return;
    }

    navigateTo(
      instructorPortalKidsPromotionCandidatesPath(clubSlug, { date: trimmedDate }),
    );
  }

  const todayKey = getLondonTodayDateKey();
  const navigationDateKey = resolveKidsPromotionNavigationDateKey(initialDate, todayKey);
  const isFiltered = Boolean(initialDate || initialDays);

  return (
    <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-dojo-white">Search by date</h2>
        <p className="text-xs text-dojo-muted">
          Pick a class date to review promotion candidates from that session. Leave
          cleared to show today&apos;s classes only.
        </p>
      </div>

      {filterHeading ? (
        <p className="rounded-lg border border-dojo-red/30 bg-dojo-red/10 px-3 py-2 text-sm font-medium text-dojo-white">
          {filterHeading}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label
            htmlFor="promotion-candidates-date-search"
            className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted"
          >
            Session date
          </label>
          <input
            id="promotion-candidates-date-search"
            name="date"
            type="date"
            value={dateValue}
            onChange={(event) => setDateValue(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClassName}>
            Show classes
          </button>
          {isFiltered ? (
            <button
              type="button"
              className={buttonClassName}
              onClick={() => navigateTo(instructorPortalKidsPromotionCandidatesPath(clubSlug))}
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={quickButtonClassName}
          onClick={() =>
            navigateTo(
              instructorPortalKidsPromotionCandidatesPath(clubSlug, { date: todayKey }),
            )
          }
        >
          Today
        </button>
        <button
          type="button"
          className={quickButtonClassName}
          onClick={() =>
            navigateTo(buildAdjacentKidsPromotionDatePath(clubSlug, navigationDateKey, -1))
          }
        >
          Previous day
        </button>
        <button
          type="button"
          className={quickButtonClassName}
          onClick={() =>
            navigateTo(buildAdjacentKidsPromotionDatePath(clubSlug, navigationDateKey, 1))
          }
        >
          Next day
        </button>
        <button
          type="button"
          className={quickButtonClassName}
          onClick={() =>
            navigateTo(
              instructorPortalKidsPromotionCandidatesPath(clubSlug, {
                date: addLondonCalendarDays(todayKey, -1),
              }),
            )
          }
        >
          Yesterday
        </button>
        {isFiltered ? (
          <button
            type="button"
            className={quickButtonClassName}
            onClick={() => navigateTo(instructorPortalKidsPromotionCandidatesPath(clubSlug))}
          >
            Back to today
          </button>
        ) : null}
      </div>
    </section>
  );
}
