import "server-only";

import {
  filterAdultBeltLevelsForPromotion,
  filterJuniorBeltLevelsForPromotion,
  type BeltLevelProgressionRow,
  type GradingRequirementRow,
  type JuniorGradingRequirementRow,
} from "@/lib/admin-belt-promotion.shared";
import {
  loadBeltLevelsForClub,
  loadGradingRequirementsByTargetBeltId,
  loadJuniorGradingRequirementsByFromBeltId,
} from "@/lib/admin-belt-promotion.server";
import {
  parsePositiveIntegerField,
  type AdultBeltRequirementRow,
  type BeltManagementPageData,
  type JuniorBeltRequirementRow,
} from "@/lib/admin-belt-management.shared";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type {
  AdultBeltRequirementRow,
  BeltManagementPageData,
  JuniorBeltRequirementRow,
} from "@/lib/admin-belt-management.shared";

function buildAdultRequirementRows(
  beltLevels: BeltLevelProgressionRow[],
  requirementsByTargetBeltId: Map<string, GradingRequirementRow>,
) {
  const adultBelts = filterAdultBeltLevelsForPromotion(beltLevels);
  const rows: AdultBeltRequirementRow[] = [];

  for (const belt of adultBelts) {
    const requirement = requirementsByTargetBeltId.get(belt.id);

    if (!requirement) {
      continue;
    }

    rows.push({
      id: requirement.id,
      targetBeltLabel: formatAdminBeltLabel(belt),
      sortOrder: belt.sort_order,
      requiredAttendance: requirement.minimum_attendances,
      requiredMonths: requirement.minimum_months,
    });
  }

  return rows.sort((left, right) => left.sortOrder - right.sortOrder);
}

function buildJuniorRequirementRows(
  beltLevels: BeltLevelProgressionRow[],
  requirementsByFromBeltId: Map<string, JuniorGradingRequirementRow>,
) {
  const juniorBelts = filterJuniorBeltLevelsForPromotion(beltLevels);
  const beltById = new Map(juniorBelts.map((belt) => [belt.id, belt]));
  const clubBeltIds = new Set(juniorBelts.map((belt) => belt.id));
  const rows: JuniorBeltRequirementRow[] = [];

  for (const [fromBeltId, requirement] of Array.from(requirementsByFromBeltId)) {
    if (!clubBeltIds.has(fromBeltId)) {
      continue;
    }

    const fromBelt = beltById.get(fromBeltId);
    const toBelt = beltById.get(requirement.to_belt_level_id);

    if (!fromBelt || !toBelt) {
      continue;
    }

    rows.push({
      id: requirement.id,
      fromBeltLabel: formatAdminBeltLabel(fromBelt),
      toBeltLabel: formatAdminBeltLabel(toBelt),
      sortOrder: fromBelt.sort_order,
      requiredAttendance: requirement.required_attendance,
      requiredWeeks: requirement.required_weeks,
    });
  }

  return rows.sort((left, right) => left.sortOrder - right.sortOrder);
}

async function assertBeltLevelBelongsToClub(beltLevelId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("belt_levels")
    .select("id")
    .eq("id", beltLevelId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify belt level: ${error.message}`);
  }

  if (!data) {
    throw new Error("Requirement not found for this club.");
  }
}

export async function updateAdultGradingRequirement(input: {
  clubId: string;
  requirementId: string;
  requiredAttendance: number;
  requiredMonths: number;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: requirement, error: loadError } = await supabase
    .from("grading_requirements")
    .select("id, belt_level_id")
    .eq("id", input.requirementId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load grading requirement: ${loadError.message}`);
  }

  if (!requirement) {
    throw new Error("Grading requirement not found.");
  }

  await assertBeltLevelBelongsToClub(requirement.belt_level_id, input.clubId);

  const { error: updateError } = await supabase
    .from("grading_requirements")
    .update({
      minimum_attendances: input.requiredAttendance,
      minimum_months: input.requiredMonths,
    })
    .eq("id", input.requirementId);

  if (updateError) {
    throw new Error(`Unable to update grading requirement: ${updateError.message}`);
  }
}

export async function updateJuniorGradingRequirement(input: {
  clubId: string;
  requirementId: string;
  requiredAttendance: number;
  requiredWeeks: number;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: requirement, error: loadError } = await supabase
    .from("junior_grading_requirements")
    .select("id, from_belt_level_id")
    .eq("id", input.requirementId)
    .maybeSingle();

  if (loadError) {
    throw new Error(
      `Failed to load junior grading requirement: ${loadError.message}`,
    );
  }

  if (!requirement) {
    throw new Error("Junior grading requirement not found.");
  }

  await assertBeltLevelBelongsToClub(requirement.from_belt_level_id, input.clubId);

  const { error: updateError } = await supabase
    .from("junior_grading_requirements")
    .update({
      required_attendance: input.requiredAttendance,
      required_weeks: input.requiredWeeks,
    })
    .eq("id", input.requirementId);

  if (updateError) {
    throw new Error(
      `Unable to update junior grading requirement: ${updateError.message}`,
    );
  }
}

export async function getBeltManagementPageData(
  clubId: string,
): Promise<BeltManagementPageData> {
  const [beltLevels, requirementsByTargetBeltId, requirementsByFromBeltId] =
    await Promise.all([
      loadBeltLevelsForClub(clubId),
      loadGradingRequirementsByTargetBeltId(),
      loadJuniorGradingRequirementsByFromBeltId(clubId),
    ]);

  return {
    adultRequirements: buildAdultRequirementRows(
      beltLevels,
      requirementsByTargetBeltId,
    ),
    juniorRequirements: buildJuniorRequirementRows(
      beltLevels,
      requirementsByFromBeltId,
    ),
  };
}
