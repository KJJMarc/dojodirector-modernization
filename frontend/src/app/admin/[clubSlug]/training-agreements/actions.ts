"use server";

import { redirect } from "next/navigation";
import { revalidateTrainingAgreementsPaths } from "@/lib/admin-revalidate.server";
import {
  isClubAgreementType,
  type ClubAgreementType,
} from "@/lib/club-agreement-templates.shared";
import { saveClubAgreementTemplate } from "@/lib/club-agreement-templates.server";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function saveTrainingAgreementTemplateAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const agreementTypeRaw = String(formData.get("agreementType") ?? "").trim();

  if (!isClubAgreementType(agreementTypeRaw)) {
    throw new Error("Unknown agreement type.");
  }

  const agreementType = agreementTypeRaw as ClubAgreementType;
  const templateId = String(formData.get("templateId") ?? "").trim() || null;

  await saveClubAgreementTemplate({
    clubId: club.id,
    agreementType,
    templateId,
    title: String(formData.get("title") ?? ""),
    version: String(formData.get("version") ?? ""),
    body: String(formData.get("body") ?? ""),
    isActive: formData.get("isActive") === "on",
  });

  revalidateTrainingAgreementsPaths(clubSlug);
  redirect(clubAdminPath(clubSlug, "training-agreements"));
}
