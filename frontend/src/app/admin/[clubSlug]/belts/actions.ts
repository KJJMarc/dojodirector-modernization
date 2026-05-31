"use server";

import {
  updateAdultGradingRequirement,
  updateJuniorGradingRequirement,
} from "@/lib/admin-belt-management.server";
import { parsePositiveIntegerField } from "@/lib/admin-belt-management.shared";
import { revalidateBeltManagementPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function updateAdultBeltRequirementAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const requirementId = String(formData.get("requirementId") ?? "");
  const requiredAttendance = parsePositiveIntegerField(
    String(formData.get("requiredAttendance") ?? ""),
    "Required attendance",
  );
  const requiredMonths = parsePositiveIntegerField(
    String(formData.get("requiredMonths") ?? ""),
    "Required months",
  );

  if (!requirementId) {
    throw new Error("Missing requirement id.");
  }

  await updateAdultGradingRequirement({
    clubId: club.id,
    requirementId,
    requiredAttendance,
    requiredMonths,
  });

  revalidateBeltManagementPaths(clubSlug);
}

export async function updateJuniorBeltRequirementAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const requirementId = String(formData.get("requirementId") ?? "");
  const requiredAttendance = parsePositiveIntegerField(
    String(formData.get("requiredAttendance") ?? ""),
    "Required attendance",
  );
  const requiredWeeks = parsePositiveIntegerField(
    String(formData.get("requiredWeeks") ?? ""),
    "Required weeks",
  );

  if (!requirementId) {
    throw new Error("Missing requirement id.");
  }

  await updateJuniorGradingRequirement({
    clubId: club.id,
    requirementId,
    requiredAttendance,
    requiredWeeks,
  });

  revalidateBeltManagementPaths(clubSlug);
}
