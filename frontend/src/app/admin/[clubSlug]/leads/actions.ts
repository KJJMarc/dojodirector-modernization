"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import {
  resetAcademyLeadWorkflowToDefault,
  saveAcademyLeadWorkflow,
  toAcademyLeadWorkflowInput,
} from "@/lib/lead-workflow.server";
import type { AcademyLeadWorkflowInput } from "@/lib/lead-workflow.shared";
import {
  archiveLead,
  createAdminLead,
  deleteLead,
  restoreLead,
  updateLeadAdminRecord,
} from "@/lib/leads.server";
import {
  clubLeadDetailAdminPath,
  clubLeadNewAdminPath,
  clubLeadWorkflowSettingsAdminPath,
  clubLeadsAdminPath,
  clubLeadsArchivedAdminPath,
  clubLeadsListAdminPath,
  parseLeadExperienceLevel,
  parseLeadProgrammeInterest,
  parseManualLeadSource,
  parseLeadStatus,
} from "@/lib/leads.shared";

function revalidateLeadAdminPaths(clubSlug: string, leadId?: string) {
  revalidatePath(clubLeadsAdminPath(clubSlug));
  revalidatePath(clubLeadsListAdminPath(clubSlug));
  revalidatePath(clubLeadsArchivedAdminPath(clubSlug));
  revalidatePath(clubLeadNewAdminPath(clubSlug));
  revalidatePath(clubLeadWorkflowSettingsAdminPath(clubSlug));

  if (leadId) {
    revalidatePath(clubLeadDetailAdminPath(clubSlug, leadId));
  }
}

export async function createLeadAction(clubSlug: string, formData: FormData) {
  const { club } = await requireAdminAccessForClubSlug(clubSlug);

  const result = await createAdminLead(club.id, {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    programmeInterest: parseLeadProgrammeInterest(
      String(formData.get("programmeInterest") ?? ""),
    ),
    experienceLevel: parseLeadExperienceLevel(
      String(formData.get("experienceLevel") ?? ""),
    ),
    leadSource: parseManualLeadSource(String(formData.get("leadSource") ?? "other")),
    notes: String(formData.get("notes") ?? ""),
    status: parseLeadStatus(String(formData.get("status") ?? "new_enquiry")),
  });

  revalidateLeadAdminPaths(club.slug);

  return result;
}

export async function updateLeadAction(input: {
  clubSlug: string;
  leadId: string;
  fullName: string;
  email: string;
  phone: string;
  programmeInterest: string;
  experienceLevel: string;
  leadSource: string;
  status: string;
  notes: string;
}) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  await updateLeadAdminRecord({
    academyId: club.id,
    leadId: input.leadId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    programmeInterest: input.programmeInterest,
    experienceLevel: input.experienceLevel,
    leadSource: input.leadSource,
    status: parseLeadStatus(input.status),
    notes: input.notes,
  });

  revalidateLeadAdminPaths(club.slug, input.leadId);
}

export async function archiveLeadAction(input: { clubSlug: string; leadId: string }) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  await archiveLead({
    academyId: club.id,
    leadId: input.leadId,
  });

  revalidateLeadAdminPaths(club.slug, input.leadId);
}

export async function restoreLeadAction(input: { clubSlug: string; leadId: string }) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  await restoreLead({
    academyId: club.id,
    leadId: input.leadId,
  });

  revalidateLeadAdminPaths(club.slug, input.leadId);
}

export async function deleteLeadAction(input: { clubSlug: string; leadId: string }) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  await deleteLead({
    academyId: club.id,
    leadId: input.leadId,
  });

  revalidateLeadAdminPaths(club.slug, input.leadId);
}

export async function logLeadActivityAction(input: {
  clubSlug: string;
  leadId: string;
  activityType: string;
  body?: string;
  followUpAt?: string | null;
}) {
  const { club, session } = await requireAdminAccessForClubSlug(input.clubSlug);
  const { logLeadActivity } = await import("@/lib/lead-activities.server");
  const { isManualLeadActivityType } = await import("@/lib/leads-crm.shared");

  if (!isManualLeadActivityType(input.activityType)) {
    throw new Error("Unsupported activity type.");
  }

  await logLeadActivity({
    academyId: club.id,
    leadId: input.leadId,
    activityType: input.activityType,
    body: input.body,
    staffUserId: session.userId,
    staffDisplayName: session.fullName,
    followUpAt: input.followUpAt ?? null,
  });

  revalidateLeadAdminPaths(club.slug, input.leadId);
}

export async function saveLeadWorkflowAction(input: {
  clubSlug: string;
  workflow: AcademyLeadWorkflowInput;
}) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  await saveAcademyLeadWorkflow(club.id, input.workflow);

  revalidateLeadAdminPaths(club.slug);
}

export async function resetLeadWorkflowAction(input: { clubSlug: string }) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  const workflow = await resetAcademyLeadWorkflowToDefault(club.id);

  revalidateLeadAdminPaths(club.slug);

  return toAcademyLeadWorkflowInput(workflow);
}
