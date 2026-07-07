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

const inputClassName =
  `${DATE_SEARCH_FORM_LAYOUT.fieldInput} rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30`;

const buttonClassName =
  "inline-flex min-h-[40px] max-w-full shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";

const quickButtonClassName =
  "inline-flex min-h-[36px] max-w-full shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-black px-3 text-xs font-semibold text-dojo-muted transition hover:border-dojo-red/50 hover:text-dojo-white";

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
    <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div className="space-y-1">
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
        <div className={DATE_SEARCH_FORM_LAYOUT.fieldWrapper}>
          <label
            htmlFor="attendance-date-search"
            className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted"
          >
            Session date
          </label>
          <input
            id="attendance-date-search"
            name="date"
            type="date"
            value={dateValue}
            onChange={(event) => setDateValue(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className={DATE_SEARCH_FORM_LAYOUT.actionRow}>
          <button type="submit" className={buttonClassName}>
            Show sessions
          </button>
          {isFiltered ? (
            <button
              type="button"
              className={buttonClassName}
              onClick={() => navigateTo(buildRegisterHref(navContext))}
            >
              Clear
            </button>
          ) : null}
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
