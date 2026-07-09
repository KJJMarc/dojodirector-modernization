import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads.shared";
import type { AcademyLeadWorkflow, AcademyLeadWorkflowStage } from "@/lib/leads-crm.shared";
import {
  DEFAULT_ACADEMY_LEAD_WORKFLOW_STAGES,
  buildDefaultAcademyLeadWorkflow,
} from "@/lib/leads-crm.shared";

export interface AcademyLeadWorkflowInput {
  name: string;
  stages: AcademyLeadWorkflowStage[];
  archiveAfterDays: number | null;
  recommendArchiveAfterFinalStage: boolean;
}

export type WorkflowValidationResult =
  | { ok: true; workflow: AcademyLeadWorkflowInput }
  | { ok: false; message: string };

function slugifyWorkflowStageKey(label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "stage";
}

export function normalizeWorkflowStage(
  stage: Partial<AcademyLeadWorkflowStage> & Pick<AcademyLeadWorkflowStage, "label">,
  index: number,
): AcademyLeadWorkflowStage {
  const label = stage.label.trim();
  const key = stage.key?.trim() || `${slugifyWorkflowStageKey(label)}_${index + 1}`;

  return {
    key,
    label,
    triggerDaysAfter: Math.max(0, Number(stage.triggerDaysAfter ?? 0)),
    triggerDaysAfterMax:
      stage.triggerDaysAfterMax === undefined || stage.triggerDaysAfterMax === null
        ? undefined
        : Math.max(0, Number(stage.triggerDaysAfterMax)),
    appliesToStatuses: normalizeAppliesToStatuses(stage.appliesToStatuses),
    recommendedActionLabel: (stage.recommendedActionLabel ?? label).trim(),
    isActive: stage.isActive !== false,
  };
}

export function normalizeAppliesToStatuses(
  statuses: LeadStatus[] | undefined,
): LeadStatus[] | undefined {
  if (!statuses?.length) {
    return undefined;
  }

  const normalized = statuses.filter((status): status is LeadStatus =>
    LEAD_STATUSES.includes(status),
  );

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeAcademyLeadWorkflowInput(
  input: AcademyLeadWorkflowInput,
): AcademyLeadWorkflowInput {
  return {
    name: input.name.trim(),
    stages: input.stages.map((stage, index) => normalizeWorkflowStage(stage, index)),
    archiveAfterDays:
      input.archiveAfterDays === null || input.archiveAfterDays === undefined
        ? null
        : Math.max(0, Number(input.archiveAfterDays)),
    recommendArchiveAfterFinalStage: input.recommendArchiveAfterFinalStage === true,
  };
}

export function validateAcademyLeadWorkflowInput(
  input: AcademyLeadWorkflowInput,
): WorkflowValidationResult {
  const workflow = normalizeAcademyLeadWorkflowInput(input);

  if (!workflow.name) {
    return { ok: false, message: "Workflow name is required." };
  }

  const activeStages = workflow.stages.filter((stage) => stage.isActive);

  if (activeStages.length === 0) {
    return { ok: false, message: "At least one active stage is required." };
  }

  const keys = new Set<string>();

  for (const stage of workflow.stages) {
    if (!stage.key.trim()) {
      return { ok: false, message: "Every stage needs a key." };
    }

    if (keys.has(stage.key)) {
      return { ok: false, message: `Duplicate stage key: ${stage.key}` };
    }

    keys.add(stage.key);

    if (!stage.isActive) {
      continue;
    }

    if (!stage.label.trim()) {
      return { ok: false, message: "Active stages need a label." };
    }

    if (!stage.recommendedActionLabel.trim()) {
      return { ok: false, message: `Stage "${stage.label}" needs a recommended action.` };
    }

    if (stage.triggerDaysAfterMax !== undefined && stage.triggerDaysAfterMax < stage.triggerDaysAfter) {
      return {
        ok: false,
        message: `Stage "${stage.label}" max day cannot be before the trigger day.`,
      };
    }
  }

  if (
    workflow.recommendArchiveAfterFinalStage &&
    (workflow.archiveAfterDays === null || Number.isNaN(workflow.archiveAfterDays))
  ) {
    return {
      ok: false,
      message: "Set archive recommendation days when archive recommendation is enabled.",
    };
  }

  return { ok: true, workflow };
}

export function getActiveWorkflowStagesForStatus(
  workflow: Pick<AcademyLeadWorkflow, "stages">,
  status: LeadStatus,
): AcademyLeadWorkflowStage[] {
  return workflow.stages
    .filter((stage) => stage.isActive !== false)
    .filter((stage) => {
      if (!stage.appliesToStatuses?.length) {
        return true;
      }

      return stage.appliesToStatuses.includes(status);
    })
    .sort((left, right) => left.triggerDaysAfter - right.triggerDaysAfter);
}

export function resolveCurrentWorkflowStage(input: {
  workflow: Pick<AcademyLeadWorkflow, "stages">;
  status: LeadStatus;
  outboundContactAttempts: number;
}): AcademyLeadWorkflowStage | null {
  const activeStages = getActiveWorkflowStagesForStatus(input.workflow, input.status);

  if (activeStages.length === 0) {
    return null;
  }

  const stageIndex = Math.min(input.outboundContactAttempts, activeStages.length - 1);

  return activeStages[stageIndex] ?? null;
}

export function buildWorkflowFollowUpBanner(input: {
  stage: AcademyLeadWorkflowStage | null;
  daysUntilDue: number;
  overdueDays: number;
  recommendArchive: boolean;
}): string {
  if (input.recommendArchive) {
    return "Recommend archive — no response after final follow-up";
  }

  if (!input.stage) {
    return "Follow-up recommended";
  }

  if (input.overdueDays > 0) {
    return `${input.stage.recommendedActionLabel} — overdue by ${input.overdueDays} day${
      input.overdueDays === 1 ? "" : "s"
    }`;
  }

  if (input.daysUntilDue === 0) {
    return input.stage.recommendedActionLabel;
  }

  return input.stage.recommendedActionLabel;
}

export function buildDefaultAcademyLeadWorkflowInput(): AcademyLeadWorkflowInput {
  const workflow = buildDefaultAcademyLeadWorkflow("template");

  return {
    name: workflow.name,
    stages: workflow.stages.map((stage) => ({ ...stage })),
    archiveAfterDays: workflow.archiveAfterDays,
    recommendArchiveAfterFinalStage: workflow.recommendArchiveAfterFinalStage,
  };
}

export function serializeWorkflowStagesForStorage(stages: AcademyLeadWorkflowStage[]) {
  return stages.map((stage) => ({
    key: stage.key,
    label: stage.label,
    triggerDaysAfter: stage.triggerDaysAfter,
    triggerDaysAfterMax: stage.triggerDaysAfterMax,
    appliesToStatuses: stage.appliesToStatuses,
    recommendedActionLabel: stage.recommendedActionLabel,
    isActive: stage.isActive !== false,
  }));
}

export function parseWorkflowStagesFromStorage(value: unknown): AcademyLeadWorkflowStage[] {
  if (!Array.isArray(value)) {
    return DEFAULT_ACADEMY_LEAD_WORKFLOW_STAGES.map((stage) => ({
      ...stage,
      recommendedActionLabel: stage.recommendedActionLabel ?? stage.label,
      isActive: stage.isActive !== false,
    }));
  }

  return value.map((row, index) =>
    normalizeWorkflowStage(row as AcademyLeadWorkflowStage, index),
  );
}

export const WORKFLOW_APPLIES_TO_STATUS_OPTIONS = LEAD_STATUSES;
