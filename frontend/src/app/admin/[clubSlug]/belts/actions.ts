"use server";

import {
  createAdminBeltSystem,
  createBeltSystemLevel,
  deleteBeltSystemLevel,
  setBeltSystemLevelActive,
  updateAdultGradingRequirement,
  updateBeltLevelDetails,
  updateBeltSystemLevelRequirement,
  updateJuniorGradingRequirement,
} from "@/lib/admin-belt-systems.server";
import {
  parseBeltTimeUnit,
  parseNonNegativeIntegerField,
  parsePositiveIntegerField,
} from "@/lib/admin-belt-systems.shared";
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

export async function updateBeltSystemLevelAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const beltSystemId = String(formData.get("beltSystemId") ?? "");
  const requirementId = String(formData.get("requirementId") ?? "");

  if (!beltSystemId || !requirementId) {
    throw new Error("Missing belt system or requirement id.");
  }

  await updateBeltSystemLevelRequirement({
    clubId: club.id,
    beltSystemId,
    requirementId,
    requiredAttendance: parsePositiveIntegerField(
      String(formData.get("requiredAttendance") ?? ""),
      "Required attendance",
    ),
    requiredTimeValue: parsePositiveIntegerField(
      String(formData.get("requiredTimeValue") ?? ""),
      "Required time",
    ),
    requiredTimeUnit: parseBeltTimeUnit(
      String(formData.get("requiredTimeUnit") ?? "months"),
    ),
  });

  revalidateBeltManagementPaths(clubSlug);
}

export async function createBeltSystemAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const name = String(formData.get("name") ?? "").trim();

  await createAdminBeltSystem({
    clubId: club.id,
    name,
    description: String(formData.get("description") ?? ""),
    defaultTimeUnit: parseBeltTimeUnit(
      String(formData.get("defaultTimeUnit") ?? "months"),
    ),
    isActive: formData.get("isActive") === "on",
  });

  revalidateBeltManagementPaths(clubSlug);
}

export async function createBeltSystemLevelAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const beltSystemId = String(formData.get("beltSystemId") ?? "");

  if (!beltSystemId) {
    throw new Error("Missing belt system id.");
  }

  await createBeltSystemLevel({
    clubId: club.id,
    beltSystemId,
    name: String(formData.get("name") ?? ""),
    sortOrder: parseNonNegativeIntegerField(
      String(formData.get("sortOrder") ?? ""),
      "Display order",
    ),
    requiredAttendance: parsePositiveIntegerField(
      String(formData.get("requiredAttendance") ?? ""),
      "Required attendance",
    ),
    requiredTimeValue: parsePositiveIntegerField(
      String(formData.get("requiredTimeValue") ?? ""),
      "Required time",
    ),
    requiredTimeUnit: parseBeltTimeUnit(
      String(formData.get("requiredTimeUnit") ?? "months"),
    ),
    colour: String(formData.get("colour") ?? ""),
    isActive: formData.get("isActive") !== "off",
  });

  revalidateBeltManagementPaths(clubSlug);
}

export async function deleteBeltSystemLevelAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const beltLevelId = String(formData.get("beltLevelId") ?? "");

  if (!beltLevelId) {
    throw new Error("Missing belt level id.");
  }

  await deleteBeltSystemLevel({
    clubId: club.id,
    beltLevelId,
  });

  revalidateBeltManagementPaths(clubSlug);
}

export async function setBeltSystemLevelActiveAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const beltLevelId = String(formData.get("beltLevelId") ?? "");

  if (!beltLevelId) {
    throw new Error("Missing belt level id.");
  }

  await setBeltSystemLevelActive({
    clubId: club.id,
    beltLevelId,
    isActive: formData.get("isActive") === "true",
  });

  revalidateBeltManagementPaths(clubSlug);
}

export async function saveBeltLevelDetailsAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const beltLevelId = String(formData.get("beltLevelId") ?? "");
  const beltSystemId = String(formData.get("beltSystemId") ?? "");
  const requirementId = String(formData.get("requirementId") ?? "");

  if (!beltLevelId || !beltSystemId || !requirementId) {
    throw new Error("Missing belt details.");
  }

  await updateBeltLevelDetails({
    clubId: club.id,
    beltLevelId,
    beltSystemId,
    requirementId,
    name: String(formData.get("name") ?? ""),
    sortOrder: parseNonNegativeIntegerField(
      String(formData.get("sortOrder") ?? ""),
      "Display order",
    ),
    requiredAttendance: parsePositiveIntegerField(
      String(formData.get("requiredAttendance") ?? ""),
      "Required attendance",
    ),
    requiredTimeValue: parsePositiveIntegerField(
      String(formData.get("requiredTimeValue") ?? ""),
      "Required time",
    ),
    requiredTimeUnit: parseBeltTimeUnit(
      String(formData.get("requiredTimeUnit") ?? "months"),
    ),
    colour: String(formData.get("colour") ?? ""),
  });

  revalidateBeltManagementPaths(clubSlug);
}
