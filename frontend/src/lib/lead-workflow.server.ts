import "server-only";

import {
  buildDefaultAcademyLeadWorkflow,
  type AcademyLeadWorkflow,
  type AcademyLeadWorkflowStage,
} from "@/lib/leads-crm.shared";
import {
  normalizeWorkflowStage,
  parseWorkflowStagesFromStorage,
  serializeWorkflowStagesForStorage,
  validateAcademyLeadWorkflowInput,
  type AcademyLeadWorkflowInput,
} from "@/lib/lead-workflow.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

function isMissingRecommendArchiveColumnError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return error.code === "42703" || message.includes("recommend_archive_after_final_stage");
}

const WORKFLOW_SELECT_WITH_ARCHIVE_FLAG =
  "academy_id, name, stages, archive_after_days, recommend_archive_after_final_stage, updated_at";
const WORKFLOW_SELECT_LEGACY = "academy_id, name, stages, archive_after_days, updated_at";

let academyLeadWorkflowsTableAvailable: boolean | null = null;

function isMissingAcademyLeadWorkflowsTableError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    message.includes("academy_lead_workflows") ||
    message.includes("does not exist")
  );
}

export async function checkAcademyLeadWorkflowsTableAvailable() {
  if (academyLeadWorkflowsTableAvailable === true) {
    return true;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("academy_lead_workflows").select("academy_id").limit(0);

  if (error && isMissingAcademyLeadWorkflowsTableError(error)) {
    academyLeadWorkflowsTableAvailable = false;
    return false;
  }

  if (error) {
    return false;
  }

  academyLeadWorkflowsTableAvailable = true;
  return true;
}

async function loadWorkflowRow(academyId: string) {
  const supabase = getSupabaseAdminClient();
  let { data, error } = await supabase
    .from("academy_lead_workflows")
    .select(WORKFLOW_SELECT_WITH_ARCHIVE_FLAG)
    .eq("academy_id", academyId)
    .maybeSingle();

  if (error && isMissingRecommendArchiveColumnError(error)) {
    ({ data, error } = await supabase
      .from("academy_lead_workflows")
      .select(WORKFLOW_SELECT_LEGACY)
      .eq("academy_id", academyId)
      .maybeSingle());
  }

  return { data, error };
}

function mapWorkflowStageRow(row: Record<string, unknown>): AcademyLeadWorkflowStage {
  return normalizeWorkflowStage(
    {
      key: String(row.key ?? ""),
      label: String(row.label ?? ""),
      triggerDaysAfter: Number(row.triggerDaysAfter ?? row.trigger_days_after ?? 0),
      triggerDaysAfterMax:
        row.triggerDaysAfterMax !== undefined
          ? Number(row.triggerDaysAfterMax)
          : row.trigger_days_after_max !== undefined
            ? Number(row.trigger_days_after_max)
            : undefined,
      appliesToStatuses: Array.isArray(row.appliesToStatuses)
        ? (row.appliesToStatuses as AcademyLeadWorkflowStage["appliesToStatuses"])
        : Array.isArray(row.applies_to_statuses)
          ? (row.applies_to_statuses as AcademyLeadWorkflowStage["appliesToStatuses"])
          : undefined,
      recommendedActionLabel: String(
        row.recommendedActionLabel ?? row.recommended_action_label ?? row.label ?? "",
      ),
      isActive: row.isActive !== false && row.is_active !== false,
    },
    0,
  );
}

function mapWorkflowRow(row: {
  academy_id: string;
  name: string;
  stages: unknown;
  archive_after_days: number | null;
  recommend_archive_after_final_stage?: boolean | null;
  updated_at: string;
}): AcademyLeadWorkflow {
  const stages = Array.isArray(row.stages)
    ? row.stages.map((stage, index) =>
        mapWorkflowStageRow({ ...(stage as Record<string, unknown>), label: String((stage as Record<string, unknown>).label ?? `Stage ${index + 1}`) }),
      )
    : parseWorkflowStagesFromStorage(row.stages);

  return {
    academyId: row.academy_id,
    name: row.name,
    stages,
    archiveAfterDays: row.archive_after_days,
    recommendArchiveAfterFinalStage: row.recommend_archive_after_final_stage === true,
    updatedAt: row.updated_at,
  };
}

async function upsertAcademyLeadWorkflow(
  academyId: string,
  workflow: AcademyLeadWorkflowInput,
): Promise<AcademyLeadWorkflow> {
  const tableAvailable = await checkAcademyLeadWorkflowsTableAvailable();

  if (!tableAvailable) {
    throw new Error(
      "Lead workflow settings are not set up yet. Please run the database migration.",
    );
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const payload = {
    academy_id: academyId,
    name: workflow.name,
    stages: serializeWorkflowStagesForStorage(workflow.stages),
    archive_after_days: workflow.archiveAfterDays,
    recommend_archive_after_final_stage: workflow.recommendArchiveAfterFinalStage,
    updated_at: now,
  };

  let { data, error } = await supabase
    .from("academy_lead_workflows")
    .upsert(payload, { onConflict: "academy_id" })
    .select(WORKFLOW_SELECT_WITH_ARCHIVE_FLAG)
    .single();

  if (error && isMissingRecommendArchiveColumnError(error)) {
    const legacyPayload = {
      academy_id: academyId,
      name: workflow.name,
      stages: serializeWorkflowStagesForStorage(workflow.stages),
      archive_after_days: workflow.archiveAfterDays,
      updated_at: now,
    };

    ({ data, error } = await supabase
      .from("academy_lead_workflows")
      .upsert(legacyPayload, { onConflict: "academy_id" })
      .select(WORKFLOW_SELECT_LEGACY)
      .single());
  }

  if (error) {
    throw new Error(`Failed to save academy lead workflow: ${error.message}`);
  }

  return mapWorkflowRow({
    ...(data as {
      academy_id: string;
      name: string;
      stages: unknown;
      archive_after_days: number | null;
      updated_at: string;
      recommend_archive_after_final_stage?: boolean | null;
    }),
    recommend_archive_after_final_stage:
      data &&
      "recommend_archive_after_final_stage" in data
        ? (data as { recommend_archive_after_final_stage?: boolean | null })
            .recommend_archive_after_final_stage
        : workflow.recommendArchiveAfterFinalStage,
  });
}

export async function ensureAcademyLeadWorkflow(academyId: string): Promise<AcademyLeadWorkflow> {
  const tableAvailable = await checkAcademyLeadWorkflowsTableAvailable();

  if (!tableAvailable) {
    return buildDefaultAcademyLeadWorkflow(academyId);
  }

  const { data, error } = await loadWorkflowRow(academyId);

  if (error) {
    if (isMissingAcademyLeadWorkflowsTableError(error)) {
      academyLeadWorkflowsTableAvailable = false;
      return buildDefaultAcademyLeadWorkflow(academyId);
    }

    throw new Error(`Failed to load academy lead workflow: ${error.message}`);
  }

  if (data) {
    const row = data as {
      academy_id: string;
      name: string;
      stages: unknown;
      archive_after_days: number | null;
      updated_at: string;
      recommend_archive_after_final_stage?: boolean | null;
    };

    return mapWorkflowRow({
      ...row,
      recommend_archive_after_final_stage:
        row.recommend_archive_after_final_stage ?? Boolean(row.archive_after_days),
    });
  }

  const defaultWorkflow = buildDefaultAcademyLeadWorkflow(academyId);
  const supabase = getSupabaseAdminClient();
  const { data: inserted, error: insertError } = await supabase
    .from("academy_lead_workflows")
    .insert({
      academy_id: academyId,
      name: defaultWorkflow.name,
      stages: serializeWorkflowStagesForStorage(defaultWorkflow.stages),
      archive_after_days: defaultWorkflow.archiveAfterDays,
      recommend_archive_after_final_stage: defaultWorkflow.recommendArchiveAfterFinalStage,
      updated_at: defaultWorkflow.updatedAt,
    })
    .select(WORKFLOW_SELECT_WITH_ARCHIVE_FLAG)
    .single();

  if (insertError && isMissingRecommendArchiveColumnError(insertError)) {
    const { data: legacyInserted, error: legacyInsertError } = await supabase
      .from("academy_lead_workflows")
      .insert({
        academy_id: academyId,
        name: defaultWorkflow.name,
        stages: serializeWorkflowStagesForStorage(defaultWorkflow.stages),
        archive_after_days: defaultWorkflow.archiveAfterDays,
        updated_at: defaultWorkflow.updatedAt,
      })
      .select(WORKFLOW_SELECT_LEGACY)
      .single();

    if (legacyInsertError) {
      if (isMissingAcademyLeadWorkflowsTableError(legacyInsertError)) {
        academyLeadWorkflowsTableAvailable = false;
        return buildDefaultAcademyLeadWorkflow(academyId);
      }

      throw new Error(`Failed to create academy lead workflow: ${legacyInsertError.message}`);
    }

    return mapWorkflowRow({
      ...(legacyInserted as {
        academy_id: string;
        name: string;
        stages: unknown;
        archive_after_days: number | null;
        updated_at: string;
      }),
      recommend_archive_after_final_stage: defaultWorkflow.recommendArchiveAfterFinalStage,
    });
  }

  if (insertError) {
    if (isMissingAcademyLeadWorkflowsTableError(insertError)) {
      academyLeadWorkflowsTableAvailable = false;
      return buildDefaultAcademyLeadWorkflow(academyId);
    }

    throw new Error(`Failed to create academy lead workflow: ${insertError.message}`);
  }

  return mapWorkflowRow(inserted as {
    academy_id: string;
    name: string;
    stages: unknown;
    archive_after_days: number | null;
    updated_at: string;
    recommend_archive_after_final_stage?: boolean | null;
  });
}

export async function loadAcademyLeadWorkflow(academyId: string): Promise<AcademyLeadWorkflow> {
  return ensureAcademyLeadWorkflow(academyId);
}

export async function saveAcademyLeadWorkflow(
  academyId: string,
  input: AcademyLeadWorkflowInput,
): Promise<AcademyLeadWorkflow> {
  const validation = validateAcademyLeadWorkflowInput(input);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  return upsertAcademyLeadWorkflow(academyId, validation.workflow);
}

export async function resetAcademyLeadWorkflowToDefault(
  academyId: string,
): Promise<AcademyLeadWorkflow> {
  const defaultWorkflow = buildDefaultAcademyLeadWorkflow(academyId);

  return upsertAcademyLeadWorkflow(academyId, {
    name: defaultWorkflow.name,
    stages: defaultWorkflow.stages,
    archiveAfterDays: defaultWorkflow.archiveAfterDays,
    recommendArchiveAfterFinalStage: defaultWorkflow.recommendArchiveAfterFinalStage,
  });
}

export function toAcademyLeadWorkflowInput(workflow: AcademyLeadWorkflow): AcademyLeadWorkflowInput {
  return {
    name: workflow.name,
    stages: workflow.stages.map((stage) => ({ ...stage })),
    archiveAfterDays: workflow.archiveAfterDays,
    recommendArchiveAfterFinalStage: workflow.recommendArchiveAfterFinalStage,
  };
}
