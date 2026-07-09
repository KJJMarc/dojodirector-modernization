import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminLeadHistoryRow } from "@/lib/leads.shared";
import {
  DEFAULT_LEAD_HISTORY_REPORT_FILTERS,
  buildLeadHistoryMonthComparison,
  buildLeadHistoryMonthRows,
  buildLeadHistoryReconciliation,
  computeLeadHistoryMonthMetrics,
  filterLeadsForHistoryReport,
  filterLeadsForMonthDrillDown,
  formatMetricChange,
  getPreviousMonthKey,
  resolveLeadHistoryDefaultDisplayedLeads,
  resolveLeadHistoryDrillDownLeads,
} from "@/lib/lead-history-report.shared";

function buildLead(
  overrides: Partial<AdminLeadHistoryRow> & Pick<AdminLeadHistoryRow, "id" | "fullName">,
): AdminLeadHistoryRow {
  return {
    email: `${overrides.id}@example.com`,
    phone: null,
    programmeInterest: "bjj",
    experienceLevel: "not_sure",
    leadSource: "google_search",
    leadSourceLabel: "Organic Search",
    status: "new_enquiry",
    statusLabel: "New Enquiry",
    trialAttendancePending: false,
    createdAt: "2026-06-01T10:00:00.000Z",
    submittedAt: "2026-06-01T10:00:00.000Z",
    contactedAt: null,
    trialBookedAt: null,
    trialAttendedAt: null,
    joinedAt: null,
    lastActivityAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    linkedTrialSessionStartsAt: null,
    followUpStatus: "ok",
    archivedAt: null,
    ...overrides,
  };
}

describe("lead history report", () => {
  it("computes submission-month and joined-month metrics separately", () => {
    const leads = [
      buildLead({ id: "1", fullName: "Alice", submittedAt: "2026-06-10T10:00:00.000Z" }),
      buildLead({
        id: "2",
        fullName: "Bob",
        submittedAt: "2026-05-01T10:00:00.000Z",
        status: "joined",
        joinedAt: "2026-06-15T10:00:00.000Z",
      }),
      buildLead({
        id: "3",
        fullName: "Cara",
        submittedAt: "2026-06-20T10:00:00.000Z",
        status: "trial_attended",
        trialAttendedAt: "2026-06-22T10:00:00.000Z",
      }),
    ];

    const june = computeLeadHistoryMonthMetrics(leads, "2026-06");

    assert.equal(june.totalLeads, 2);
    assert.equal(june.joined, 1);
    assert.equal(june.trialsAttended, 1);
  });

  it("builds month rows newest first and supports drill-down", () => {
    const leads = [
      buildLead({ id: "1", fullName: "Alice", submittedAt: "2026-06-10T10:00:00.000Z" }),
      buildLead({ id: "2", fullName: "Bob", submittedAt: "2026-05-01T10:00:00.000Z" }),
    ];

    const rows = buildLeadHistoryMonthRows(leads);

    assert.equal(rows[0]?.monthKey, "2026-06");
    assert.equal(filterLeadsForMonthDrillDown(leads, "2026-06").length, 1);
  });

  it("formats month-over-month change labels", () => {
    assert.equal(formatMetricChange(42, 34), "+8 / +24%");
    assert.equal(formatMetricChange(6, 7), "-1 / -14%");
  });

  it("compares selected month with the previous month", () => {
    const current = computeLeadHistoryMonthMetrics(
      [buildLead({ id: "1", fullName: "Alice", submittedAt: "2026-06-10T10:00:00.000Z" })],
      "2026-06",
    );
    const previous = computeLeadHistoryMonthMetrics([], "2026-05");
    const comparison = buildLeadHistoryMonthComparison(current, previous);

    assert.equal(getPreviousMonthKey("2026-06"), "2026-05");
    assert.equal(comparison[0]?.changeLabel, "+1 (—)");
  });

  it("default lead history rows include every academy lead regardless of status or archive state", () => {
    const leads = [
      buildLead({ id: "1", fullName: "Alice", status: "new_enquiry" }),
      buildLead({ id: "2", fullName: "Bob", status: "trial_booked" }),
      buildLead({ id: "3", fullName: "Cara", status: "trial_attended" }),
      buildLead({ id: "4", fullName: "Dan", status: "trial_missed" }),
      buildLead({
        id: "5",
        fullName: "Eve",
        status: "joined",
        joinedAt: "2026-06-15T10:00:00.000Z",
      }),
      buildLead({
        id: "6",
        fullName: "Fran",
        status: "trial_booked",
        archivedAt: "2026-06-20T10:00:00.000Z",
      }),
      buildLead({
        id: "7",
        fullName: "Gus",
        status: "joined",
        joinedAt: "2026-07-01T10:00:00.000Z",
        archivedAt: "2026-07-02T10:00:00.000Z",
      }),
    ];

    const defaultDisplayed = resolveLeadHistoryDefaultDisplayedLeads(leads);
    const drillDownAll = resolveLeadHistoryDrillDownLeads(
      filterLeadsForHistoryReport(leads, DEFAULT_LEAD_HISTORY_REPORT_FILTERS),
      null,
    );
    const reconciliation = buildLeadHistoryReconciliation(leads, defaultDisplayed);

    assert.equal(defaultDisplayed.length, leads.length);
    assert.equal(drillDownAll.length, leads.length);
    assert.deepEqual(
      defaultDisplayed.map((lead) => lead.id).sort(),
      leads.map((lead) => lead.id).sort(),
    );
    assert.equal(reconciliation.totalLeadsInDb, 7);
    assert.equal(reconciliation.activeNonArchivedLeads, 5);
    assert.equal(reconciliation.archivedLeads, 2);
    assert.equal(reconciliation.joinedLeads, 2);
    assert.equal(reconciliation.rowsDisplayed, 7);
    assert.equal(reconciliation.reconciles, true);
  });

  it("month drill-down is a subset of the full academy lead list", () => {
    const leads = [
      buildLead({ id: "1", fullName: "Alice", submittedAt: "2026-06-10T10:00:00.000Z" }),
      buildLead({ id: "2", fullName: "Bob", submittedAt: "2026-05-01T10:00:00.000Z" }),
    ];

    const juneOnly = resolveLeadHistoryDrillDownLeads(leads, "2026-06");
    const reconciliation = buildLeadHistoryReconciliation(leads, juneOnly);

    assert.equal(juneOnly.length, 1);
    assert.equal(reconciliation.rowsDisplayed, 1);
    assert.equal(reconciliation.reconciles, false);
  });
});
