import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminLeadListRow } from "@/lib/leads.shared";
import { computeLeadFollowUpStatus } from "@/lib/leads.shared";
import {
  applyActiveLeadsQuickFilter,
  buildActiveLeadsDashboardSummary,
  buildDefaultAcademyLeadWorkflow,
  computeLeadHealth,
  computeNextWorkflowFollowUpAt,
  countOutboundContactAttempts,
  enrichLeadWithCrmFields,
  parseLeadActivityFollowUpAt,
  type LeadActivity,
} from "@/lib/leads-crm.shared";

function buildLead(
  overrides: Partial<AdminLeadListRow> & Pick<AdminLeadListRow, "id" | "fullName">,
): AdminLeadListRow {
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
    followUpStatus: computeLeadFollowUpStatus({
      status: overrides.status ?? "new_enquiry",
      submittedAt: overrides.submittedAt ?? "2026-06-01T10:00:00.000Z",
      contactedAt: overrides.contactedAt ?? null,
      trialAttendedAt: overrides.trialAttendedAt ?? null,
      linkedTrialSessionStartsAt: overrides.linkedTrialSessionStartsAt ?? null,
    }),
    ...overrides,
  };
}

function buildActivity(
  overrides: Partial<LeadActivity> & Pick<LeadActivity, "id" | "leadId" | "activityType">,
): LeadActivity {
  return {
    direction: "outbound",
    body: null,
    staffUserId: null,
    staffDisplayName: "Marc",
    followUpAt: null,
    createdAt: "2026-06-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("leads crm workspace", () => {
  const workflow = buildDefaultAcademyLeadWorkflow("academy-1");
  const now = new Date("2026-06-05T12:00:00.000Z");

  it("uses academy workflow stages without academy-specific hardcoding", () => {
    assert.equal(workflow.stages.length, 4);
    assert.equal(workflow.stages[0]?.triggerDaysAfter, 0);
    assert.equal(workflow.stages[1]?.triggerDaysAfter, 3);
  });

  it("marks overdue new enquiries from workflow timing", () => {
    const lead = buildLead({
      id: "1",
      fullName: "Alice",
      submittedAt: "2026-05-01T10:00:00.000Z",
    });

    const health = computeLeadHealth({
      lead,
      activities: [
        {
          id: "a1",
          leadId: "1",
          activityType: "enquiry_received",
          direction: "system",
          body: null,
          staffUserId: null,
          staffDisplayName: null,
          followUpAt: null,
          createdAt: "2026-05-01T10:00:00.000Z",
        },
      ],
      workflow,
      now,
    });

    assert.equal(health.health, "overdue");
    assert.match(health.bannerLabel ?? "", /overdue by/i);
  });

  it("shows waiting after outbound contact without a reply", () => {
    const lead = buildLead({
      id: "2",
      fullName: "Bob",
      submittedAt: "2026-06-04T10:00:00.000Z",
    });

    const health = computeLeadHealth({
      lead,
      activities: [
        buildActivity({
          id: "a1",
          leadId: "2",
          activityType: "email_sent",
          createdAt: "2026-06-04T11:00:00.000Z",
        }),
      ],
      workflow,
      now,
    });

    assert.equal(health.health, "waiting");
    assert.equal(health.bannerLabel, "Waiting for their reply");
  });

  it("computes contact attempts from activities only", () => {
    const activities = [
      buildActivity({ id: "a1", leadId: "3", activityType: "email_sent" }),
      buildActivity({ id: "a2", leadId: "3", activityType: "phone_call" }),
      buildActivity({
        id: "a3",
        leadId: "3",
        activityType: "enquiry_received",
        direction: "system",
      }),
    ];

    assert.equal(countOutboundContactAttempts(activities), 2);
  });

  it("builds dashboard counts for daily action cards", () => {
    const leads = [
      enrichLeadWithCrmFields({
        lead: buildLead({
          id: "1",
          fullName: "Alice",
          submittedAt: "2026-05-01T10:00:00.000Z",
        }),
        activities: [],
        workflow,
        now,
      }),
      enrichLeadWithCrmFields({
        lead: buildLead({
          id: "2",
          fullName: "Bob",
          status: "trial_booked",
          trialBookedAt: "2026-06-04T10:00:00.000Z",
          linkedTrialSessionStartsAt: "2026-06-10T10:00:00.000Z",
        }),
        activities: [],
        workflow,
        now,
      }),
      enrichLeadWithCrmFields({
        lead: buildLead({
          id: "3",
          fullName: "Cara",
          status: "joined",
          joinedAt: "2026-06-02T10:00:00.000Z",
        }),
        activities: [],
        workflow,
        now,
      }),
    ];

    const dashboard = buildActiveLeadsDashboardSummary(leads, now);

    assert.equal(dashboard.overdue, 1);
    assert.equal(dashboard.awaitingTrial, 1);
    assert.equal(dashboard.joinedThisMonth, 1);
  });

  it("filters no-contact leads for quick chips", () => {
    const leads = [
      enrichLeadWithCrmFields({
        lead: buildLead({ id: "1", fullName: "Alice" }),
        activities: [],
        workflow,
        now,
      }),
      enrichLeadWithCrmFields({
        lead: buildLead({ id: "2", fullName: "Bob" }),
        activities: [
          buildActivity({ id: "a1", leadId: "2", activityType: "phone_call" }),
        ],
        workflow,
        now,
      }),
    ];

    const filtered = applyActiveLeadsQuickFilter(leads, "no_contact_yet", now);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.fullName, "Alice");
  });

  it("advances workflow follow-up based on outbound contact count", () => {
    const lead = buildLead({
      id: "4",
      fullName: "Dan",
      submittedAt: "2026-06-01T10:00:00.000Z",
    });
    const activities = [
      buildActivity({ id: "a1", leadId: "4", activityType: "email_sent" }),
    ];

    const nextFollowUp = computeNextWorkflowFollowUpAt(lead, activities, workflow, now);

    assert.equal(nextFollowUp, "2026-06-04T09:00:00.000Z");
  });
});

describe("parseLeadActivityFollowUpAt", () => {
  it("parses HTML date input values as ISO timestamps", () => {
    assert.equal(parseLeadActivityFollowUpAt("2026-07-09"), "2026-07-09T09:00:00.000Z");
  });

  it("parses UK DD/MM/YYYY dates", () => {
    assert.equal(parseLeadActivityFollowUpAt("09/07/2026"), "2026-07-09T09:00:00.000Z");
  });

  it("returns null for empty or invalid values", () => {
    assert.equal(parseLeadActivityFollowUpAt(""), null);
    assert.equal(parseLeadActivityFollowUpAt("not-a-date"), null);
    assert.equal(parseLeadActivityFollowUpAt("31/02/2026"), null);
  });
});

describe("post-trial and trial-booked health", () => {
  const workflow = buildDefaultAcademyLeadWorkflow("academy-1");
  const now = new Date("2026-06-10T15:00:00.000Z");

  it("keeps a future Trial Booked lead Healthy", () => {
    const health = computeLeadHealth({
      lead: buildLead({
        id: "tb-future",
        fullName: "Future Trial",
        status: "trial_booked",
        statusLabel: "Trial Booked",
        trialBookedAt: "2026-06-08T10:00:00.000Z",
        linkedTrialSessionStartsAt: "2026-06-12T18:00:00.000Z",
      }),
      activities: [],
      workflow,
      now,
    });

    assert.equal(health.health, "healthy");
    assert.match(health.bannerLabel ?? "", /Trial/i);
    assert.equal(health.nextFollowUpAt, null);
  });

  it("flags a past Trial Booked lead for attendance confirmation without assuming Trial Missed", () => {
    const lead = buildLead({
      id: "tb-past",
      fullName: "Past Trial",
      status: "trial_booked",
      statusLabel: "Trial Booked",
      trialBookedAt: "2026-06-01T10:00:00.000Z",
      linkedTrialSessionStartsAt: "2026-06-05T18:00:00.000Z",
    });

    const health = computeLeadHealth({
      lead,
      activities: [],
      workflow,
      now,
    });

    assert.equal(lead.status, "trial_booked");
    assert.equal(health.health, "overdue");
    assert.equal(health.bannerLabel, "Trial date passed — update attendance or follow up");
    assert.equal(health.nextFollowUpAt, "2026-06-05T09:00:00.000Z");
  });

  it("does not mark today's Trial Booked lead overdue from UTC conversion", () => {
    // 23:30 UTC on 9 Jun is still 10 Jun evening in London during BST.
    const londonEvening = new Date("2026-06-09T23:30:00.000Z");
    const health = computeLeadHealth({
      lead: buildLead({
        id: "tb-today",
        fullName: "Today Trial",
        status: "trial_booked",
        statusLabel: "Trial Booked",
        trialBookedAt: "2026-06-08T10:00:00.000Z",
        linkedTrialSessionStartsAt: "2026-06-10T18:00:00.000Z",
      }),
      activities: [],
      workflow,
      now: londonEvening,
    });

    assert.equal(health.health, "healthy");
    assert.equal(health.bannerLabel, "Trial today");
  });

  it("requires follow-up for Trial Attended leads with no post-trial contact", () => {
    const health = computeLeadHealth({
      lead: buildLead({
        id: "ta-1",
        fullName: "Attended",
        status: "trial_attended",
        statusLabel: "Trial Attended",
        trialBookedAt: "2026-06-01T10:00:00.000Z",
        trialAttendedAt: "2026-06-05T18:00:00.000Z",
        linkedTrialSessionStartsAt: "2026-06-05T18:00:00.000Z",
      }),
      activities: [],
      workflow,
      now,
    });

    assert.equal(health.health, "overdue");
    assert.equal(health.bannerLabel, "Trial attended — follow up about joining");
    assert.equal(health.nextFollowUpAt, "2026-06-06T09:00:00.000Z");
  });

  it("progresses Trial Attended leads to a final follow-up after the initial contact", () => {
    const health = computeLeadHealth({
      lead: buildLead({
        id: "ta-2",
        fullName: "Attended Contacted",
        status: "trial_attended",
        statusLabel: "Trial Attended",
        trialAttendedAt: "2026-06-01T18:00:00.000Z",
        contactedAt: "2026-06-02T10:00:00.000Z",
      }),
      activities: [
        buildActivity({
          id: "a1",
          leadId: "ta-2",
          activityType: "phone_call",
          createdAt: "2026-06-02T10:00:00.000Z",
        }),
      ],
      workflow,
      now,
    });

    assert.equal(health.health, "overdue");
    assert.equal(health.bannerLabel, "No response — final follow-up due");
    assert.equal(health.nextFollowUpAt, "2026-06-05T09:00:00.000Z");
  });

  it("does not require follow-up for Joined leads", () => {
    const health = computeLeadHealth({
      lead: buildLead({
        id: "joined-1",
        fullName: "Joined",
        status: "joined",
        statusLabel: "Joined",
        joinedAt: "2026-06-08T10:00:00.000Z",
        trialAttendedAt: "2026-06-01T18:00:00.000Z",
      }),
      activities: [],
      workflow,
      now,
    });

    assert.equal(health.health, "closed");
    assert.equal(health.nextFollowUpAt, null);
  });

  it("respects a manually scheduled future follow-up date", () => {
    const health = computeLeadHealth({
      lead: buildLead({
        id: "ta-manual",
        fullName: "Manual Follow Up",
        status: "trial_attended",
        statusLabel: "Trial Attended",
        trialAttendedAt: "2026-06-01T18:00:00.000Z",
      }),
      activities: [
        buildActivity({
          id: "a1",
          leadId: "ta-manual",
          activityType: "note",
          direction: "system",
          createdAt: "2026-06-02T10:00:00.000Z",
          followUpAt: "2026-06-20T09:00:00.000Z",
        }),
      ],
      workflow,
      now,
    });

    assert.equal(health.nextFollowUpAt, "2026-06-20T09:00:00.000Z");
    assert.equal(health.health, "healthy");
  });
});

describe("active leads urgency sort with post-trial actions", () => {
  it("sorts overdue post-trial actions above healthy leads", async () => {
    const { sortActiveLeadsCrm } = await import("@/lib/leads-crm-list-sort.shared");
    const workflow = buildDefaultAcademyLeadWorkflow("academy-1");
    const now = new Date("2026-06-10T15:00:00.000Z");

    const overdueAttended = enrichLeadWithCrmFields({
      lead: buildLead({
        id: "overdue",
        fullName: "Zoe Overdue",
        status: "trial_attended",
        statusLabel: "Trial Attended",
        trialAttendedAt: "2026-06-01T18:00:00.000Z",
      }),
      activities: [],
      workflow,
      now,
    });
    const healthyBooked = enrichLeadWithCrmFields({
      lead: buildLead({
        id: "healthy",
        fullName: "Amy Healthy",
        status: "trial_booked",
        statusLabel: "Trial Booked",
        linkedTrialSessionStartsAt: "2026-06-15T18:00:00.000Z",
      }),
      activities: [],
      workflow,
      now,
    });

    const sorted = sortActiveLeadsCrm([healthyBooked, overdueAttended]);

    assert.equal(sorted[0]?.id, "overdue");
    assert.equal(sorted[1]?.id, "healthy");
  });
});
