"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LeadHistoryMonthSummary } from "@/components/admin/lead-history-month-summary";
import { LeadHistoryMonthTable } from "@/components/admin/lead-history-month-table";
import { LeadHistoryQuickFilters } from "@/components/admin/lead-history-quick-filters";
import { LeadHistoryReconciliationLine } from "@/components/admin/lead-history-reconciliation-line";
import { LeadHistoryReportFiltersBar } from "@/components/admin/lead-history-report-filters";
import { LeadHistoryTrendCharts } from "@/components/admin/lead-history-trend-charts";
import { SortableLeadHistoryTable } from "@/components/admin/sortable-lead-history-table";
import {
  DEFAULT_LEAD_HISTORY_QUICK_FILTER,
  DEFAULT_LEAD_HISTORY_REPORT_FILTERS,
  buildLeadHistoryChartPoints,
  buildLeadHistoryMonthComparison,
  buildLeadHistoryMonthRows,
  buildLeadHistoryReconciliation,
  buildMonthKey,
  computeLeadHistoryMonthMetrics,
  filterLeadsForHistoryReport,
  formatLeadHistoryMonthLabel,
  getCurrentLondonMonthKey,
  getPreviousMonthKey,
  listAvailableReportYears,
  parseMonthKey,
  resolveLeadHistoryTableLeads,
  type LeadHistoryQuickFilter,
  type LeadHistoryReportFilters,
} from "@/lib/lead-history-report.shared";
import type { AdminLeadHistoryRow } from "@/lib/leads.shared";

interface LeadHistoryClientProps {
  clubSlug: string;
  leads: AdminLeadHistoryRow[];
  initialSearchQuery?: string;
}

function parseSelectedMonthParts(monthKey: string) {
  const parsed = parseMonthKey(monthKey);

  if (!parsed) {
    const current = getCurrentLondonMonthKey();
    const currentParsed = parseMonthKey(current);

    return currentParsed ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  }

  return parsed;
}

export function LeadHistoryClient({
  clubSlug,
  leads,
  initialSearchQuery = "",
}: LeadHistoryClientProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const initialMonthKey = getCurrentLondonMonthKey();
  const initialParts = parseSelectedMonthParts(initialMonthKey);

  const [filters, setFilters] = useState<LeadHistoryReportFilters>(
    DEFAULT_LEAD_HISTORY_REPORT_FILTERS,
  );
  const [selectedYear, setSelectedYear] = useState(initialParts.year);
  const [selectedMonth, setSelectedMonth] = useState(initialParts.month);
  const [drillDownMonthKey, setDrillDownMonthKey] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<LeadHistoryQuickFilter>(
    DEFAULT_LEAD_HISTORY_QUICK_FILTER,
  );
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const selectedMonthKey = buildMonthKey(selectedYear, selectedMonth);
  const availableYears = useMemo(() => listAvailableReportYears(leads), [leads]);

  const filteredLeads = useMemo(
    () => filterLeadsForHistoryReport(leads, filters),
    [leads, filters],
  );

  const tableLeads = useMemo(
    () =>
      resolveLeadHistoryTableLeads({
        leads,
        reportFilters: filters,
        drillDownMonthKey,
        quickFilter,
      }),
    [leads, filters, drillDownMonthKey, quickFilter],
  );

  const monthRows = useMemo(
    () => buildLeadHistoryMonthRows(filteredLeads),
    [filteredLeads],
  );

  const chartPoints = useMemo(() => buildLeadHistoryChartPoints(monthRows), [monthRows]);

  const selectedMonthMetrics = useMemo(
    () => computeLeadHistoryMonthMetrics(filteredLeads, selectedMonthKey),
    [filteredLeads, selectedMonthKey],
  );

  const previousMonthMetrics = useMemo(() => {
    const previousMonthKey = getPreviousMonthKey(selectedMonthKey);

    if (!previousMonthKey) {
      return null;
    }

    return computeLeadHistoryMonthMetrics(filteredLeads, previousMonthKey);
  }, [filteredLeads, selectedMonthKey]);

  const monthComparison = useMemo(
    () => buildLeadHistoryMonthComparison(selectedMonthMetrics, previousMonthMetrics),
    [selectedMonthMetrics, previousMonthMetrics],
  );

  const reconciliation = useMemo(
    () => buildLeadHistoryReconciliation(leads, tableLeads),
    [leads, tableLeads],
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !reconciliation.reconciles) {
      console.warn("[Lead History] Count reconciliation mismatch", reconciliation);
    }
  }, [reconciliation]);

  const handleSelectedMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleMonthTableSelect = (monthKey: string) => {
    const parsed = parseSelectedMonthParts(monthKey);
    setSelectedYear(parsed.year);
    setSelectedMonth(parsed.month);
    setDrillDownMonthKey(monthKey);
    setQuickFilter(DEFAULT_LEAD_HISTORY_QUICK_FILTER);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-8">
      <div ref={tableRef} className="space-y-4">
        <LeadHistoryReconciliationLine reconciliation={reconciliation} />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
              {drillDownMonthKey
                ? `All leads for ${formatLeadHistoryMonthLabel(drillDownMonthKey)}`
                : "All leads"}
            </h2>
            <p className="mt-1 text-sm text-dojo-muted">
              {drillDownMonthKey
                ? "Month drill-down is active. Use View all leads to return to the full academy history."
                : "Every lead still recorded for this academy, including joined and archived leads."}
            </p>
          </div>

          {drillDownMonthKey ? (
            <button
              type="button"
              onClick={() => {
                setDrillDownMonthKey(null);
                setQuickFilter(DEFAULT_LEAD_HISTORY_QUICK_FILTER);
              }}
              className="rounded-md border border-dojo-border px-3 py-2 text-sm text-dojo-muted transition hover:border-dojo-red/50 hover:text-dojo-white"
            >
              View all leads
            </button>
          ) : null}
        </div>

        <LeadHistoryQuickFilters value={quickFilter} onChange={setQuickFilter} />

        <label className="block max-w-md">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Search lead history
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, email, phone, source, programme, or status"
            className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white placeholder:text-dojo-muted focus:border-dojo-red/60 focus:outline-none"
          />
        </label>

        <SortableLeadHistoryTable
          clubSlug={clubSlug}
          leads={tableLeads}
          searchQuery={searchQuery}
        />
      </div>

      <section aria-label="Monthly lead reporting" className="space-y-8 border-t border-dojo-border pt-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Monthly reporting
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Explore trends by month. Click a month row below to drill into that month&apos;s leads
            in the table above.
          </p>
        </div>

        <LeadHistoryReportFiltersBar
          filters={filters}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          availableYears={availableYears}
          onFiltersChange={setFilters}
          onSelectedMonthChange={handleSelectedMonthChange}
        />

        <LeadHistoryMonthSummary monthKey={selectedMonthKey} comparison={monthComparison} />

        <LeadHistoryTrendCharts points={chartPoints} />

        <LeadHistoryMonthTable
          rows={monthRows}
          selectedMonthKey={drillDownMonthKey}
          onSelectMonth={handleMonthTableSelect}
        />
      </section>
    </div>
  );
}
