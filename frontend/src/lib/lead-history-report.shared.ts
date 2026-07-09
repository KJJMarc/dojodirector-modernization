import {
  formatAnalyticsLeadSourceLabel,
  formatLeadSourceConversionPercent,
  normalizeLeadSourceForAnalytics,
  type AnalyticsLeadSource,
} from "@/lib/lead-source-analytics.shared";
import { utcIsoToLondonDate } from "@/lib/london-datetime";
import {
  LEAD_PROGRAMME_INTERESTS,
  LEAD_STATUSES,
  type AdminLeadHistoryRow,
  type LeadProgrammeInterest,
  type LeadStatus,
} from "@/lib/leads.shared";

export type LeadHistoryArchivedFilter = "all" | "active" | "archived";

export interface LeadHistoryReportFilters {
  programme: LeadProgrammeInterest | "all";
  leadSource: AnalyticsLeadSource | "all";
  status: LeadStatus | "all";
  archived: LeadHistoryArchivedFilter;
  dateFrom: string | null;
  dateTo: string | null;
}

export const DEFAULT_LEAD_HISTORY_REPORT_FILTERS: LeadHistoryReportFilters = {
  programme: "all",
  leadSource: "all",
  status: "all",
  archived: "all",
  dateFrom: null,
  dateTo: null,
};

export interface LeadHistoryMonthMetrics {
  monthKey: string;
  monthLabel: string;
  totalLeads: number;
  newEnquiries: number;
  trialsBooked: number;
  trialsAttended: number;
  trialsMissed: number;
  joined: number;
  archived: number;
  conversionRateLabel: string;
  conversionRatePercent: number;
  trialAttendanceRateLabel: string;
  topLeadSource: string;
}

export interface LeadHistoryMonthComparisonMetric {
  label: string;
  current: number | string;
  previous: number | string;
  changeLabel: string;
}

export interface LeadHistoryChartPoint {
  monthKey: string;
  monthLabel: string;
  totalLeads: number;
  joined: number;
  conversionRatePercent: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function getLondonMonthKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) {
    return null;
  }

  const dateKey = utcIsoToLondonDate(iso);

  if (!dateKey || dateKey.length < 7) {
    return null;
  }

  return dateKey.slice(0, 7);
}

export function formatLeadHistoryMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) {
    return monthKey;
  }

  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function buildMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } | null {
  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function getPreviousMonthKey(monthKey: string): string | null {
  const parsed = parseMonthKey(monthKey);

  if (!parsed) {
    return null;
  }

  if (parsed.month === 1) {
    return buildMonthKey(parsed.year - 1, 12);
  }

  return buildMonthKey(parsed.year, parsed.month - 1);
}

export function getCurrentLondonMonthKey(from = new Date()): string {
  const monthKey = getLondonMonthKeyFromIso(from.toISOString());

  return monthKey ?? buildMonthKey(from.getUTCFullYear(), from.getUTCMonth() + 1);
}

export function isIsoInLondonDateRange(
  iso: string,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
): boolean {
  const dateKey = utcIsoToLondonDate(iso);

  if (dateFrom && dateKey < dateFrom) {
    return false;
  }

  if (dateTo && dateKey > dateTo) {
    return false;
  }

  return true;
}

export function leadMatchesHistoryReportFilters(
  lead: AdminLeadHistoryRow,
  filters: LeadHistoryReportFilters,
): boolean {
  if (filters.programme !== "all" && lead.programmeInterest !== filters.programme) {
    return false;
  }

  if (filters.status !== "all" && lead.status !== filters.status) {
    return false;
  }

  if (filters.leadSource !== "all") {
    const normalized = normalizeLeadSourceForAnalytics(lead.leadSource);

    if (normalized !== filters.leadSource) {
      return false;
    }
  }

  if (filters.archived === "archived" && !lead.archivedAt) {
    return false;
  }

  if (filters.archived === "active" && lead.archivedAt) {
    return false;
  }

  if (!isIsoInLondonDateRange(lead.submittedAt, filters.dateFrom, filters.dateTo)) {
    return false;
  }

  return true;
}

export function filterLeadsForHistoryReport(
  leads: AdminLeadHistoryRow[],
  filters: LeadHistoryReportFilters,
): AdminLeadHistoryRow[] {
  return leads.filter((lead) => leadMatchesHistoryReportFilters(lead, filters));
}

function countByStatus(leads: AdminLeadHistoryRow[], status: LeadStatus) {
  return leads.filter((lead) => lead.status === status).length;
}

function computeTrialAttendanceRateLabel(trialsAttended: number, trialsMissed: number) {
  const trialOutcomes = trialsAttended + trialsMissed;

  if (trialOutcomes <= 0) {
    return "—";
  }

  return formatLeadSourceConversionPercent(trialsAttended, trialOutcomes);
}

function computeTopLeadSource(leads: AdminLeadHistoryRow[]): string {
  if (leads.length === 0) {
    return "—";
  }

  const counts = new Map<string, number>();

  for (const lead of leads) {
    const label = formatAnalyticsLeadSourceLabel(
      normalizeLeadSourceForAnalytics(lead.leadSource),
    );
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  let topLabel = "—";
  let topCount = 0;

  for (const [label, count] of counts.entries()) {
    if (count > topCount) {
      topLabel = label;
      topCount = count;
    }
  }

  return topLabel;
}

export function computeLeadHistoryMonthMetrics(
  leads: AdminLeadHistoryRow[],
  monthKey: string,
): LeadHistoryMonthMetrics {
  const submittedInMonth = leads.filter(
    (lead) => getLondonMonthKeyFromIso(lead.submittedAt) === monthKey,
  );
  const joinedInMonth = leads.filter(
    (lead) => getLondonMonthKeyFromIso(lead.joinedAt) === monthKey,
  );
  const trialsAttended = countByStatus(submittedInMonth, "trial_attended");
  const trialsMissed = countByStatus(submittedInMonth, "trial_missed");
  const joinedCohort = submittedInMonth.filter((lead) => lead.status === "joined").length;
  const conversionRatePercent =
    submittedInMonth.length > 0 ? (joinedCohort / submittedInMonth.length) * 100 : 0;

  return {
    monthKey,
    monthLabel: formatLeadHistoryMonthLabel(monthKey),
    totalLeads: submittedInMonth.length,
    newEnquiries: countByStatus(submittedInMonth, "new_enquiry"),
    trialsBooked: countByStatus(submittedInMonth, "trial_booked"),
    trialsAttended,
    trialsMissed,
    joined: joinedInMonth.length,
    archived: submittedInMonth.filter((lead) => Boolean(lead.archivedAt)).length,
    conversionRateLabel: formatLeadSourceConversionPercent(joinedCohort, submittedInMonth.length),
    conversionRatePercent,
    trialAttendanceRateLabel: computeTrialAttendanceRateLabel(trialsAttended, trialsMissed),
    topLeadSource: computeTopLeadSource(submittedInMonth),
  };
}

export function listLeadHistoryMonthKeys(leads: AdminLeadHistoryRow[]): string[] {
  const monthKeys = new Set<string>();

  for (const lead of leads) {
    const submittedMonth = getLondonMonthKeyFromIso(lead.submittedAt);

    if (submittedMonth) {
      monthKeys.add(submittedMonth);
    }

    const joinedMonth = getLondonMonthKeyFromIso(lead.joinedAt);

    if (joinedMonth) {
      monthKeys.add(joinedMonth);
    }
  }

  return [...monthKeys].sort((left, right) => right.localeCompare(left));
}

export function buildLeadHistoryMonthRows(
  leads: AdminLeadHistoryRow[],
): LeadHistoryMonthMetrics[] {
  return listLeadHistoryMonthKeys(leads).map((monthKey) =>
    computeLeadHistoryMonthMetrics(leads, monthKey),
  );
}

export function buildLeadHistoryChartPoints(
  monthRows: LeadHistoryMonthMetrics[],
): LeadHistoryChartPoint[] {
  return [...monthRows]
    .sort((left, right) => left.monthKey.localeCompare(right.monthKey))
    .map((row) => ({
      monthKey: row.monthKey,
      monthLabel: row.monthLabel,
      totalLeads: row.totalLeads,
      joined: row.joined,
      conversionRatePercent: row.conversionRatePercent,
    }));
}

export function formatMetricChange(current: number, previous: number): string {
  const change = current - previous;
  const sign = change > 0 ? "+" : "";

  if (previous <= 0) {
    if (change === 0) {
      return "0 (0)";
    }

    return `${sign}${change} (—)`;
  }

  const percent = (change / previous) * 100;
  const percentSign = percent > 0 ? "+" : "";

  return `${sign}${change} / ${percentSign}${percent.toFixed(0)}%`;
}

export function formatRateMetricChange(
  currentLabel: string,
  previousLabel: string,
): string {
  const current = currentLabel === "—" ? null : Number.parseFloat(currentLabel.replace("%", ""));
  const previous = previousLabel === "—" ? null : Number.parseFloat(previousLabel.replace("%", ""));

  if (current === null || previous === null || Number.isNaN(current) || Number.isNaN(previous)) {
    return "—";
  }

  const change = current - previous;
  const sign = change > 0 ? "+" : "";

  return `${sign}${change.toFixed(1)} pts`;
}

export function buildLeadHistoryMonthComparison(
  current: LeadHistoryMonthMetrics,
  previous: LeadHistoryMonthMetrics | null,
): LeadHistoryMonthComparisonMetric[] {
  const previousMetrics = previous ?? {
    ...current,
    totalLeads: 0,
    newEnquiries: 0,
    trialsBooked: 0,
    trialsAttended: 0,
    trialsMissed: 0,
    joined: 0,
    archived: 0,
    conversionRateLabel: "—",
    conversionRatePercent: 0,
    trialAttendanceRateLabel: "—",
  };

  return [
    {
      label: "Total leads",
      current: current.totalLeads,
      previous: previousMetrics.totalLeads,
      changeLabel: formatMetricChange(current.totalLeads, previousMetrics.totalLeads),
    },
    {
      label: "New enquiries",
      current: current.newEnquiries,
      previous: previousMetrics.newEnquiries,
      changeLabel: formatMetricChange(current.newEnquiries, previousMetrics.newEnquiries),
    },
    {
      label: "Trials booked",
      current: current.trialsBooked,
      previous: previousMetrics.trialsBooked,
      changeLabel: formatMetricChange(current.trialsBooked, previousMetrics.trialsBooked),
    },
    {
      label: "Trials attended",
      current: current.trialsAttended,
      previous: previousMetrics.trialsAttended,
      changeLabel: formatMetricChange(current.trialsAttended, previousMetrics.trialsAttended),
    },
    {
      label: "Trials missed",
      current: current.trialsMissed,
      previous: previousMetrics.trialsMissed,
      changeLabel: formatMetricChange(current.trialsMissed, previousMetrics.trialsMissed),
    },
    {
      label: "Joined",
      current: current.joined,
      previous: previousMetrics.joined,
      changeLabel: formatMetricChange(current.joined, previousMetrics.joined),
    },
    {
      label: "Archived",
      current: current.archived,
      previous: previousMetrics.archived,
      changeLabel: formatMetricChange(current.archived, previousMetrics.archived),
    },
    {
      label: "Conversion to joined",
      current: current.conversionRateLabel,
      previous: previousMetrics.conversionRateLabel,
      changeLabel: formatRateMetricChange(
        current.conversionRateLabel,
        previousMetrics.conversionRateLabel,
      ),
    },
    {
      label: "Trial attendance rate",
      current: current.trialAttendanceRateLabel,
      previous: previousMetrics.trialAttendanceRateLabel,
      changeLabel: formatRateMetricChange(
        current.trialAttendanceRateLabel,
        previousMetrics.trialAttendanceRateLabel,
      ),
    },
  ];
}

export function filterLeadsForMonthDrillDown(
  leads: AdminLeadHistoryRow[],
  monthKey: string,
): AdminLeadHistoryRow[] {
  return leads.filter((lead) => getLondonMonthKeyFromIso(lead.submittedAt) === monthKey);
}

export function listAvailableReportYears(leads: AdminLeadHistoryRow[]): number[] {
  const years = new Set<number>();

  for (const lead of leads) {
    for (const iso of [lead.submittedAt, lead.joinedAt]) {
      const monthKey = getLondonMonthKeyFromIso(iso);

      if (monthKey) {
        const year = Number(monthKey.slice(0, 4));

        if (!Number.isNaN(year)) {
          years.add(year);
        }
      }
    }
  }

  const currentYear = Number(getCurrentLondonMonthKey().slice(0, 4));
  years.add(currentYear);

  return [...years].sort((left, right) => right - left);
}

export const LEAD_HISTORY_REPORT_PROGRAMME_OPTIONS = ["all", ...LEAD_PROGRAMME_INTERESTS] as const;
export const LEAD_HISTORY_REPORT_STATUS_OPTIONS = ["all", ...LEAD_STATUSES] as const;
