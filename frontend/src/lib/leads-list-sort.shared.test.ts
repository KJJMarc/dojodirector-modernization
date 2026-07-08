import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminLeadListRow } from "@/lib/leads.shared";
import {
  applyAdminLeadsListView,
  DEFAULT_ADMIN_LEADS_LIST_SORT,
  filterAdminLeads,
  getNextAdminLeadsListSortDir,
  sortAdminLeads,
} from "@/lib/leads-list-sort.shared";

function buildLead(overrides: Partial<AdminLeadListRow> & Pick<AdminLeadListRow, "id" | "fullName">): AdminLeadListRow {
  return {
    email: `${overrides.id}@example.com`,
    phone: null,
    programmeInterest: "bjj",
    experienceLevel: "not_sure",
    leadSource: "website",
    leadSourceLabel: "Website",
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
    ...overrides,
  };
}

describe("sortAdminLeads", () => {
  it("sorts names by surname then first name ascending", () => {
    const leads = [
      buildLead({ id: "1", fullName: "Zoe Adams" }),
      buildLead({ id: "2", fullName: "Amy Brown" }),
      buildLead({ id: "3", fullName: "Ben Adams" }),
    ];

    const sorted = sortAdminLeads(leads, { key: "name", dir: "asc" });

    assert.deepEqual(
      sorted.map((lead) => lead.fullName),
      ["Ben Adams", "Zoe Adams", "Amy Brown"],
    );
  });

  it("uses workflow order for status sorting", () => {
    const leads = [
      buildLead({ id: "1", fullName: "Joined Lead", status: "joined", statusLabel: "Joined" }),
      buildLead({
        id: "2",
        fullName: "Trial Booked Lead",
        status: "trial_booked",
        statusLabel: "Trial Booked",
      }),
      buildLead({
        id: "3",
        fullName: "New Lead",
        status: "new_enquiry",
        statusLabel: "New Enquiry",
      }),
    ];

    const sorted = sortAdminLeads(leads, { key: "status", dir: "asc" });

    assert.deepEqual(
      sorted.map((lead) => lead.status),
      ["new_enquiry", "trial_booked", "joined"],
    );
  });

  it("prioritises needs follow up before ok leads", () => {
    const leads = [
      buildLead({
        id: "1",
        fullName: "OK Lead",
        followUpStatus: "ok",
        submittedAt: "2026-06-10T10:00:00.000Z",
      }),
      buildLead({
        id: "2",
        fullName: "Needs Lead",
        followUpStatus: "needs_follow_up",
        submittedAt: "2026-06-01T10:00:00.000Z",
      }),
    ];

    const sorted = sortAdminLeads(leads, { key: "follow_up_date", dir: "asc" });

    assert.equal(sorted[0]?.fullName, "Needs Lead");
  });

  it("defaults to last activity descending", () => {
    const leads = [
      buildLead({
        id: "1",
        fullName: "Older",
        lastActivityAt: "2026-06-01T10:00:00.000Z",
      }),
      buildLead({
        id: "2",
        fullName: "Newer",
        lastActivityAt: "2026-07-01T10:00:00.000Z",
      }),
    ];

    const sorted = sortAdminLeads(leads, DEFAULT_ADMIN_LEADS_LIST_SORT);

    assert.deepEqual(
      sorted.map((lead) => lead.fullName),
      ["Newer", "Older"],
    );
  });
});

describe("filterAdminLeads", () => {
  it("filters by search query and keeps sortable subset", () => {
    const leads = [
      buildLead({ id: "1", fullName: "Matt Houghton", email: "matt@example.com" }),
      buildLead({ id: "2", fullName: "Amy Brown", email: "amy@example.com" }),
    ];

    const filtered = filterAdminLeads(leads, "matt");

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.fullName, "Matt Houghton");
  });
});

describe("getNextAdminLeadsListSortDir", () => {
  it("toggles direction on the same column and resets to asc on a new column", () => {
    assert.equal(
      getNextAdminLeadsListSortDir({ key: "name", dir: "asc" }, "name"),
      "desc",
    );
    assert.equal(
      getNextAdminLeadsListSortDir({ key: "name", dir: "desc" }, "status"),
      "asc",
    );
  });
});

describe("applyAdminLeadsListView", () => {
  it("applies search filtering before sorting", () => {
    const leads = [
      buildLead({
        id: "1",
        fullName: "Matt Houghton",
        lastActivityAt: "2026-06-01T10:00:00.000Z",
      }),
      buildLead({
        id: "2",
        fullName: "Amy Brown",
        lastActivityAt: "2026-07-01T10:00:00.000Z",
      }),
    ];

    const visible = applyAdminLeadsListView({
      leads,
      sort: DEFAULT_ADMIN_LEADS_LIST_SORT,
      query: "matt",
    });

    assert.deepEqual(
      visible.map((lead) => lead.fullName),
      ["Matt Houghton"],
    );
  });
});
