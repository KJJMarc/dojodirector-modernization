"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addLondonCalendarDays,
  getLondonTodayDateKey,
} from "@/lib/london-datetime";
import {
  attendanceRegisterPath,
  type AttendanceRegisterNavContext,
} from "@/lib/attendance-register-navigation.shared";
import { DATE_SEARCH_FORM_LAYOUT } from "@/lib/date-search-form-layout.shared";

interface AttendanceDateSearchFormProps {
  navContext: AttendanceRegisterNavContext;
  initialDate?: string;
  initialDays?: number;
  filterHeading?: string | null;
}

const inputClassName = [
  DATE_SEARCH_FORM_LAYOUT.fieldInput,
  "rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white",
  "outline-none transition focus:border-dojo-red/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dojo-red/30",
].join(" ");

const quickButtonClassName = DATE_SEARCH_FORM_LAYOUT.navButton;

function buildRegisterHref(
  navContext: AttendanceRegisterNavContext,
  options?: { date?: string; days?: number },
) {
  const nextContext: AttendanceRegisterNavContext = {
    from: navContext.from,
    clubSlug: navContext.clubSlug,
    mode: navContext.mode,
  };

  if (options?.date) {
    nextContext.date = options.date;
  }

  if (options?.days) {
    nextContext.days = options.days;
  }

  return attendanceRegisterPath(nextContext);
}

export function AttendanceDateSearchForm({
  navContext,
  initialDate = "",
  initialDays,
  filterHeading = null,
}: AttendanceDateSearchFormProps) {
  const router = useRouter();
  const [dateValue, setDateValue] = useState(initialDate);

  function navigateTo(href: string) {
    router.push(href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDate = dateValue.trim();

    if (!trimmedDate) {
      navigateTo(buildRegisterHref(navContext));
      return;
    }

    navigateTo(buildRegisterHref(navContext, { date: trimmedDate }));
  }

  const todayKey = getLondonTodayDateKey();
  const yesterdayKey = addLondonCalendarDays(todayKey, -1);
  const isFiltered = Boolean(initialDate || initialDays);

  return (
    <section
      className={`${DATE_SEARCH_FORM_LAYOUT.card} space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4`}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="text-sm font-semibold text-dojo-white">Search by date</h2>
        <p className="text-xs text-dojo-muted">
          Pick a date to review or recover attendance registers. Leave cleared to
          show today&apos;s classes first with upcoming sessions underneath.
        </p>
      </div>

      {filterHeading ? (
        <p className="rounded-lg border border-dojo-red/30 bg-dojo-red/10 px-3 py-2 text-sm font-medium text-dojo-white">
          {filterHeading}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className={DATE_SEARCH_FORM_LAYOUT.form}>
        <div className={DATE_SEARCH_FORM_LAYOUT.controls}>
          <div className={DATE_SEARCH_FORM_LAYOUT.fieldWrapper}>
            <label
              htmlFor="attendance-date-search"
              className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted"
            >
              Session date
            </label>
            <div className={DATE_SEARCH_FORM_LAYOUT.fieldInputWrapper}>
              <input
                id="attendance-date-search"
                name="date"
                type="date"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div className={DATE_SEARCH_FORM_LAYOUT.actionRow}>
            <button type="submit" className={DATE_SEARCH_FORM_LAYOUT.actionButton}>
              Show sessions
            </button>
            {isFiltered ? (
              <button
                type="button"
                className={DATE_SEARCH_FORM_LAYOUT.actionButton}
                onClick={() => navigateTo(buildRegisterHref(navContext))}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </form>

      <div className={DATE_SEARCH_FORM_LAYOUT.nav}>
        <button
          type="button"
          className={quickButtonClassName}
          onClick={() => navigateTo(buildRegisterHref(navContext, { date: todayKey }))}
        >
          Today
        </button>
        <button
          type="button"
          className={quickButtonClassName}
          onClick={() =>
            navigateTo(buildRegisterHref(navContext, { date: yesterdayKey }))
          }
        >
          Yesterday
        </button>
        <button
          type="button"
          className={quickButtonClassName}
          onClick={() => navigateTo(buildRegisterHref(navContext, { days: 7 }))}
        >
          Last 7 days
        </button>
        {isFiltered ? (
          <button
            type="button"
            className={quickButtonClassName}
            onClick={() => navigateTo(buildRegisterHref(navContext))}
          >
            Back to upcoming
          </button>
        ) : null}
      </div>
    </section>
  );
}
