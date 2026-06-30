import {
  buildAdjacentKidsPromotionDatePath,
  instructorPortalKidsPromotionCandidatesPath,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import { addLondonCalendarDays, getLondonTodayDateKey } from "@/lib/london-datetime";

interface InstructorKidsPromotionDateSearchFormProps {
  clubSlug: string;
  selectedDateKey: string;
  filterHeading?: string | null;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2.5 text-base text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const buttonClassName =
  "inline-flex min-h-[44px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";

const quickLinkClassName =
  "inline-flex min-h-[44px] items-center justify-center rounded-md border border-dojo-border bg-dojo-black px-4 text-sm font-semibold text-dojo-muted transition hover:border-dojo-red/50 hover:text-dojo-white";

export function InstructorKidsPromotionDateSearchForm({
  clubSlug,
  selectedDateKey,
  filterHeading = null,
}: InstructorKidsPromotionDateSearchFormProps) {
  const todayKey = getLondonTodayDateKey();
  const basePath = instructorPortalKidsPromotionCandidatesPath(clubSlug);
  const isTodayView = selectedDateKey === todayKey;

  return (
    <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-dojo-white">Search by date</h2>
        <p className="text-xs text-dojo-muted">
          Pick a class date to review promotion candidates. Leave cleared to show
          today&apos;s classes.
        </p>
      </div>

      {filterHeading ? (
        <p className="rounded-lg border border-dojo-red/30 bg-dojo-red/10 px-3 py-2 text-sm font-medium text-dojo-white">
          {filterHeading}
        </p>
      ) : null}

      <form
        method="get"
        action={basePath}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
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
            defaultValue={selectedDateKey}
            className={inputClassName}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClassName}>
            Show classes
          </button>
          {!isTodayView ? (
            <a href={basePath} className={buttonClassName}>
              Clear
            </a>
          ) : null}
        </div>
      </form>

      <nav aria-label="Promotion candidates date navigation" className="flex flex-wrap gap-2">
        <a
          href={instructorPortalKidsPromotionCandidatesPath(clubSlug, { date: todayKey })}
          className={quickLinkClassName}
          aria-current={isTodayView ? "page" : undefined}
        >
          Today
        </a>
        <a
          href={buildAdjacentKidsPromotionDatePath(clubSlug, selectedDateKey, -1)}
          className={quickLinkClassName}
        >
          Previous day
        </a>
        <a
          href={buildAdjacentKidsPromotionDatePath(clubSlug, selectedDateKey, 1)}
          className={quickLinkClassName}
        >
          Next day
        </a>
        <a
          href={instructorPortalKidsPromotionCandidatesPath(clubSlug, {
            date: addLondonCalendarDays(todayKey, -1),
          })}
          className={quickLinkClassName}
        >
          Yesterday
        </a>
        {!isTodayView ? (
          <a href={basePath} className={quickLinkClassName}>
            Back to today
          </a>
        ) : null}
      </nav>
    </section>
  );
}
