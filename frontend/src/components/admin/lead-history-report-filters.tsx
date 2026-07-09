"use client";

import {
  ANALYTICS_LEAD_SOURCES,
  formatAnalyticsLeadSourceLabel,
} from "@/lib/lead-source-analytics.shared";
import {
  DEFAULT_LEAD_HISTORY_REPORT_FILTERS,
  LEAD_HISTORY_REPORT_PROGRAMME_OPTIONS,
  LEAD_HISTORY_REPORT_STATUS_OPTIONS,
  type LeadHistoryReportFilters,
} from "@/lib/lead-history-report.shared";
import {
  LEAD_STATUS_LABELS,
  formatLeadProgrammeInterestLabel,
  type LeadProgrammeInterest,
  type LeadStatus,
} from "@/lib/leads.shared";

interface LeadHistoryReportFiltersProps {
  filters: LeadHistoryReportFilters;
  selectedYear: number;
  selectedMonth: number;
  availableYears: number[];
  onFiltersChange: (filters: LeadHistoryReportFilters) => void;
  onSelectedMonthChange: (year: number, month: number) => void;
}

const selectClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white focus:border-dojo-red/60 focus:outline-none";

export function LeadHistoryReportFiltersBar({
  filters,
  selectedYear,
  selectedMonth,
  availableYears,
  onFiltersChange,
  onSelectedMonthChange,
}: LeadHistoryReportFiltersProps) {
  const updateFilters = (patch: Partial<LeadHistoryReportFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <section
      aria-label="Lead history report filters"
      className="rounded-xl border border-dojo-border bg-dojo-surface p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
        Report filters
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Month
          </span>
          <select
            value={selectedMonth}
            onChange={(event) =>
              onSelectedMonthChange(selectedYear, Number(event.target.value))
            }
            className={selectClassName}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {new Date(2026, month - 1, 1).toLocaleString("en-GB", { month: "long" })}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Year
          </span>
          <select
            value={selectedYear}
            onChange={(event) =>
              onSelectedMonthChange(Number(event.target.value), selectedMonth)
            }
            className={selectClassName}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Programme
          </span>
          <select
            value={filters.programme}
            onChange={(event) =>
              updateFilters({
                programme: event.target.value as LeadProgrammeInterest | "all",
              })
            }
            className={selectClassName}
          >
            {LEAD_HISTORY_REPORT_PROGRAMME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All programmes" : formatLeadProgrammeInterestLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Lead source
          </span>
          <select
            value={filters.leadSource}
            onChange={(event) =>
              updateFilters({
                leadSource: event.target.value as LeadHistoryReportFilters["leadSource"],
              })
            }
            className={selectClassName}
          >
            <option value="all">All sources</option>
            {ANALYTICS_LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {formatAnalyticsLeadSourceLabel(source)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Status
          </span>
          <select
            value={filters.status}
            onChange={(event) =>
              updateFilters({
                status: event.target.value as LeadStatus | "all",
              })
            }
            className={selectClassName}
          >
            {LEAD_HISTORY_REPORT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All statuses" : LEAD_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Archive state
          </span>
          <select
            value={filters.archived}
            onChange={(event) =>
              updateFilters({
                archived: event.target.value as LeadHistoryReportFilters["archived"],
              })
            }
            className={selectClassName}
          >
            <option value="all">Active and archived</option>
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Date from
          </span>
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(event) =>
              updateFilters({ dateFrom: event.target.value || null })
            }
            className={selectClassName}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Date to
          </span>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(event) => updateFilters({ dateTo: event.target.value || null })}
            className={selectClassName}
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onFiltersChange(DEFAULT_LEAD_HISTORY_REPORT_FILTERS)}
            className="w-full rounded-md border border-dojo-border px-3 py-2 text-sm text-dojo-muted transition hover:border-dojo-red/50 hover:text-dojo-white"
          >
            Reset filters
          </button>
        </div>
      </div>
    </section>
  );
}
