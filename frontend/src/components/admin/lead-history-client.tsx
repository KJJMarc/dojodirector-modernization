"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LeadHistoryMonthSummary } from "@/components/admin/lead-history-month-summary";
import { LeadHistoryMonthTable } from "@/components/admin/lead-history-month-table";
import { LeadHistoryReconciliationPanel } from "@/components/admin/lead-history-reconciliation";
import { LeadHistoryReportFiltersBar } from "@/components/admin/lead-history-report-filters";
import { LeadHistoryTrendCharts } from "@/components/admin/lead-history-trend-charts";
import { SortableLeadHistoryTable } from "@/components/admin/sortable-lead-history-table";
import {
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
  resolveLeadHistoryDrillDownLeads,
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
  const drillDownRef = useRef<HTMLDivElement>(null);
  const initialMonthKey = getCurrentLondonMonthKey();
  const initialParts = parseSelectedMonthParts(initialMonthKey);

  const [filters, setFilters] = useState<LeadHistoryReportFilters>(
    DEFAULT_LEAD_HISTORY_REPORT_FILTERS,
  );
  const [selectedYear, setSelectedYear] = useState(initialParts.year);
  const [selectedMonth, setSelectedMonth] = useState(initialParts.month);
  const [drillDownMonthKey, setDrillDownMonthKey] = useState<string | null>(null);
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

  const drillDownLeads = useMemo(
    () => resolveLeadHistoryDrillDownLeads(filteredLeads, drillDownMonthKey),
    [filteredLeads, drillDownMonthKey],
  );

  const reconciliation = useMemo(
    () => buildLeadHistoryReconciliation(leads, drillDownLeads),
    [leads, drillDownLeads],
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
    drillDownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isDefaultFilters =
    filters.programme === DEFAULT_LEAD_HISTORY_REPORT_FILTERS.programme &&
    filters.leadSource === DEFAULT_LEAD_HISTORY_REPORT_FILTERS.leadSource &&
    filters.status === DEFAULT_LEAD_HISTORY_REPORT_FILTERS.status &&
    filters.archived === DEFAULT_LEAD_HISTORY_REPORT_FILTERS.archived &&
    !filters.dateFrom &&
    !filters.dateTo;

  return (
    <div className="space-y-8">
      <LeadHistoryReconciliationPanel
        reconciliation={reconciliation}
        isMonthDrillDown={Boolean(drillDownMonthKey) || !isDefaultFilters}
      />

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

      <div ref={drillDownRef} className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
              {drillDownMonthKey
                ? `Leads for ${formatLeadHistoryMonthLabel(drillDownMonthKey)}`
                : "All leads"}
            </h2>
            <p className="mt-1 text-sm text-dojo-muted">
              {drillDownMonthKey
                ? "Leads submitted in this month after your report filters are applied."
                : "Every lead still recorded for this academy, including joined and archived leads."}
            </p>
          </div>

          {drillDownMonthKey ? (
            <button
              type="button"
              onClick={() => setDrillDownMonthKey(null)}
              className="rounded-md border border-dojo-border px-3 py-2 text-sm text-dojo-muted transition hover:border-dojo-red/50 hover:text-dojo-white"
            >
              View all leads
            </button>
          ) : null}
        </div>

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
          leads={drillDownLeads}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
