import "server-only";

import {
  buildDefaultAcademyLeadWorkflow,
  type AcademyLeadWorkflow,
  type AcademyLeadWorkflowStage,
} from "@/lib/leads-crm.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

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

function mapWorkflowStageRow(row: Record<string, unknown>): AcademyLeadWorkflowStage {
  return {
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
  };
}

function mapWorkflowRow(row: {
  academy_id: string;
  name: string;
  stages: unknown;
  archive_after_days: number | null;
  updated_at: string;
}): AcademyLeadWorkflow {
  const stages = Array.isArray(row.stages)
    ? row.stages.map((stage) => mapWorkflowStageRow(stage as Record<string, unknown>))
    : [];

  return {
    academyId: row.academy_id,
    name: row.name,
    stages,
    archiveAfterDays: row.archive_after_days,
    updatedAt: row.updated_at,
  };
}

export async function ensureAcademyLeadWorkflow(academyId: string): Promise<AcademyLeadWorkflow> {
  const tableAvailable = await checkAcademyLeadWorkflowsTableAvailable();

  if (!tableAvailable) {
    return buildDefaultAcademyLeadWorkflow(academyId);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("academy_lead_workflows")
    .select("academy_id, name, stages, archive_after_days, updated_at")
    .eq("academy_id", academyId)
    .maybeSingle();

  if (error) {
    if (isMissingAcademyLeadWorkflowsTableError(error)) {
      academyLeadWorkflowsTableAvailable = false;
      return buildDefaultAcademyLeadWorkflow(academyId);
    }

    throw new Error(`Failed to load academy lead workflow: ${error.message}`);
  }

  if (data) {
    return mapWorkflowRow(data);
  }

  const defaultWorkflow = buildDefaultAcademyLeadWorkflow(academyId);
  const { data: inserted, error: insertError } = await supabase
    .from("academy_lead_workflows")
    .insert({
      academy_id: academyId,
      name: defaultWorkflow.name,
      stages: defaultWorkflow.stages,
      archive_after_days: defaultWorkflow.archiveAfterDays,
      updated_at: defaultWorkflow.updatedAt,
    })
    .select("academy_id, name, stages, archive_after_days, updated_at")
    .single();

  if (insertError) {
    if (isMissingAcademyLeadWorkflowsTableError(insertError)) {
      academyLeadWorkflowsTableAvailable = false;
      return buildDefaultAcademyLeadWorkflow(academyId);
    }

    throw new Error(`Failed to create academy lead workflow: ${insertError.message}`);
  }

  return mapWorkflowRow(inserted);
}

export async function loadAcademyLeadWorkflow(academyId: string): Promise<AcademyLeadWorkflow> {
  return ensureAcademyLeadWorkflow(academyId);
}
