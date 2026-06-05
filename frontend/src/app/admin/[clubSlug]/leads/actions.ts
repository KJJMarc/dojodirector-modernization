"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { createAdminLead, deleteLead, updateLeadAdminRecord } from "@/lib/leads.server";
import {
  clubLeadDetailAdminPath,
  clubLeadNewAdminPath,
  clubLeadsAdminPath,
  clubLeadsListAdminPath,
  parseLeadExperienceLevel,
  parseLeadProgrammeInterest,
  parseLeadSource,
  parseLeadStatus,
} from "@/lib/leads.shared";

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
    leadSource: parseLeadSource(String(formData.get("leadSource") ?? "other")),
    notes: String(formData.get("notes") ?? ""),
    status: parseLeadStatus(String(formData.get("status") ?? "new")),
  });

  revalidatePath(clubLeadsAdminPath(club.slug));
  revalidatePath(clubLeadsListAdminPath(club.slug));

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

  revalidatePath(clubLeadsAdminPath(club.slug));
  revalidatePath(clubLeadsListAdminPath(club.slug));
  revalidatePath(clubLeadDetailAdminPath(club.slug, input.leadId));
}

export async function deleteLeadAction(input: { clubSlug: string; leadId: string }) {
  const { club } = await requireAdminAccessForClubSlug(input.clubSlug);

  await deleteLead({
    academyId: club.id,
    leadId: input.leadId,
  });

  revalidatePath(clubLeadsAdminPath(club.slug));
  revalidatePath(clubLeadsListAdminPath(club.slug));
  revalidatePath(clubLeadNewAdminPath(club.slug));
}
