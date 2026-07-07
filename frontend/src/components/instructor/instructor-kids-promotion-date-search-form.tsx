import {
  buildAdjacentKidsPromotionDatePath,
  instructorPortalKidsPromotionCandidatesPath,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import { DATE_SEARCH_FORM_LAYOUT } from "@/lib/date-search-form-layout.shared";
import { addLondonCalendarDays, getLondonTodayDateKey } from "@/lib/london-datetime";

interface InstructorKidsPromotionDateSearchFormProps {
  clubSlug: string;
  selectedDateKey: string;
  filterHeading?: string | null;
}

const inputClassName = [
  DATE_SEARCH_FORM_LAYOUT.fieldInput,
  "rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2.5 text-base text-dojo-white",
  "outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30",
].join(" ");

export function InstructorKidsPromotionDateSearchForm({
  clubSlug,
  selectedDateKey,
  filterHeading = null,
}: InstructorKidsPromotionDateSearchFormProps) {
  const todayKey = getLondonTodayDateKey();
  const basePath = instructorPortalKidsPromotionCandidatesPath(clubSlug);
  const isTodayView = selectedDateKey === todayKey;

  return (
    <section
      className={`${DATE_SEARCH_FORM_LAYOUT.card} space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4`}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="text-sm font-semibold text-dojo-white">Search by date</h2>
        <p className="text-xs text-dojo-muted">
          Pick a class date to review promotion candidates. Leave cleared to show
          today&apos;s classes.
        </p>
      </div>

      {filterHeading ? (
        <p className="min-w-0 rounded-lg border border-dojo-red/30 bg-dojo-red/10 px-3 py-2 text-sm font-medium text-dojo-white">
          {filterHeading}
        </p>
      ) : null}

      <form
        method="get"
        action={basePath}
        className={DATE_SEARCH_FORM_LAYOUT.form}
      >
        <div className={DATE_SEARCH_FORM_LAYOUT.fieldWrapper}>
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

        <div className={DATE_SEARCH_FORM_LAYOUT.actionRow}>
          <button type="submit" className={DATE_SEARCH_FORM_LAYOUT.actionButton}>
            Show classes
          </button>
          {!isTodayView ? (
            <a href={basePath} className={DATE_SEARCH_FORM_LAYOUT.actionButton}>
              Clear
            </a>
          ) : null}
        </div>
      </form>

      <nav
        aria-label="Promotion candidates date navigation"
        className={DATE_SEARCH_FORM_LAYOUT.nav}
      >
        <a
          href={instructorPortalKidsPromotionCandidatesPath(clubSlug, { date: todayKey })}
          className={DATE_SEARCH_FORM_LAYOUT.navButton}
          aria-current={isTodayView ? "page" : undefined}
        >
          Today
        </a>
        <a
          href={buildAdjacentKidsPromotionDatePath(clubSlug, selectedDateKey, -1)}
          className={DATE_SEARCH_FORM_LAYOUT.navButton}
        >
          Previous day
        </a>
        <a
          href={buildAdjacentKidsPromotionDatePath(clubSlug, selectedDateKey, 1)}
          className={DATE_SEARCH_FORM_LAYOUT.navButton}
        >
          Next day
        </a>
        <a
          href={instructorPortalKidsPromotionCandidatesPath(clubSlug, {
            date: addLondonCalendarDays(todayKey, -1),
          })}
          className={DATE_SEARCH_FORM_LAYOUT.navButton}
        >
          Yesterday
        </a>
        {!isTodayView ? (
          <a href={basePath} className={DATE_SEARCH_FORM_LAYOUT.navButton}>
            Back to today
          </a>
        ) : null}
      </nav>
    </section>
  );
}
