import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminLeadHistoryRow } from "@/lib/leads.shared";
import {
  buildLeadHistoryMonthComparison,
  buildLeadHistoryMonthRows,
  computeLeadHistoryMonthMetrics,
  filterLeadsForMonthDrillDown,
  formatMetricChange,
  getPreviousMonthKey,
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
});
