import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminLeadListRow } from "@/lib/leads.shared";
import { computeLeadFollowUpStatus } from "@/lib/leads.shared";
import { computeNextWorkflowFollowUpAt } from "@/lib/leads-crm.shared";
import {
  buildDefaultAcademyLeadWorkflowInput,
  normalizeAcademyLeadWorkflowInput,
  validateAcademyLeadWorkflowInput,
} from "@/lib/lead-workflow.shared";

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
      contactedAt: null,
      trialAttendedAt: null,
      linkedTrialSessionStartsAt: null,
    }),
    ...overrides,
  };
}

describe("lead workflow settings", () => {
  it("provides a generic default workflow template", () => {
    const workflow = buildDefaultAcademyLeadWorkflowInput();

    assert.equal(workflow.stages.length, 4);
    assert.equal(workflow.stages[0]?.triggerDaysAfter, 0);
    assert.equal(workflow.stages[1]?.triggerDaysAfterMax, 5);
    assert.equal(workflow.archiveAfterDays, 30);
    assert.equal(workflow.recommendArchiveAfterFinalStage, true);
  });

  it("accepts a valid edited workflow", () => {
    const workflow = normalizeAcademyLeadWorkflowInput({
      ...buildDefaultAcademyLeadWorkflowInput(),
      name: "Academy follow-up",
      stages: buildDefaultAcademyLeadWorkflowInput().stages.map((stage, index) =>
        index === 1
          ? { ...stage, triggerDaysAfter: 4, recommendedActionLabel: "Call the lead" }
          : stage,
      ),
    });

    const validation = validateAcademyLeadWorkflowInput(workflow);

    assert.equal(validation.ok, true);
  });

  it("rejects a workflow with no active stages", () => {
    const workflow = normalizeAcademyLeadWorkflowInput({
      ...buildDefaultAcademyLeadWorkflowInput(),
      stages: buildDefaultAcademyLeadWorkflowInput().stages.map((stage) => ({
        ...stage,
        isActive: false,
      })),
    });

    const validation = validateAcademyLeadWorkflowInput(workflow);

    assert.equal(validation.ok, false);
    if (!validation.ok) {
      assert.match(validation.message, /active stage/i);
    }
  });

  it("rejects invalid max day ordering", () => {
    const workflow = normalizeAcademyLeadWorkflowInput({
      ...buildDefaultAcademyLeadWorkflowInput(),
      stages: buildDefaultAcademyLeadWorkflowInput().stages.map((stage, index) =>
        index === 1
          ? { ...stage, triggerDaysAfter: 10, triggerDaysAfterMax: 4 }
          : stage,
      ),
    });

    const validation = validateAcademyLeadWorkflowInput(workflow);

    assert.equal(validation.ok, false);
  });

  it("changes computed follow-up dates when stage timings are edited", () => {
    const lead = buildLead({
      id: "1",
      fullName: "Alice",
      submittedAt: "2026-06-01T10:00:00.000Z",
    });
    const defaultWorkflow = {
      academyId: "academy-1",
      ...buildDefaultAcademyLeadWorkflowInput(),
      updatedAt: "2026-06-01T10:00:00.000Z",
    };
    const editedWorkflow = {
      ...defaultWorkflow,
      stages: defaultWorkflow.stages.map((stage, index) =>
        index === 1 ? { ...stage, triggerDaysAfter: 7 } : stage,
      ),
    };
    const activities = [
      {
        id: "a1",
        leadId: "1",
        activityType: "email_sent" as const,
        direction: "outbound" as const,
        body: null,
        staffUserId: null,
        staffDisplayName: null,
        followUpAt: null,
        createdAt: "2026-06-02T10:00:00.000Z",
      },
    ];

    const defaultNext = computeNextWorkflowFollowUpAt(
      lead,
      activities,
      defaultWorkflow,
      new Date("2026-06-05T12:00:00.000Z"),
    );
    const editedNext = computeNextWorkflowFollowUpAt(
      lead,
      activities,
      editedWorkflow,
      new Date("2026-06-05T12:00:00.000Z"),
    );

    assert.equal(defaultNext, "2026-06-04T09:00:00.000Z");
    assert.equal(editedNext, "2026-06-08T09:00:00.000Z");
  });

  it("reset template restores the generic default workflow", () => {
    const edited = normalizeAcademyLeadWorkflowInput({
      name: "Custom",
      stages: buildDefaultAcademyLeadWorkflowInput().stages.map((stage) => ({
        ...stage,
        label: "Changed",
      })),
      archiveAfterDays: 45,
      recommendArchiveAfterFinalStage: false,
    });
    const reset = buildDefaultAcademyLeadWorkflowInput();

    assert.notDeepEqual(edited.stages[0]?.label, reset.stages[0]?.label);
    assert.deepEqual(reset, buildDefaultAcademyLeadWorkflowInput());
  });
});
