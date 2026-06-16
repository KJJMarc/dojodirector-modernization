"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
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
