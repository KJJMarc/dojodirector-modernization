import "server-only";

import {
  filterAdultBeltLevelsForPromotion,
  filterJuniorBeltLevelsForPromotion,
  type BeltLevelProgressionRow,
  type GradingRequirementRow,
} from "@/lib/admin-belt-promotion.shared";
import {
  loadBeltLevelsForClub,
  loadGradingRequirementsByTargetBeltId,
} from "@/lib/admin-belt-promotion.server";
import {
  LEGACY_BELT_SYSTEM_ADULT_ID,
  LEGACY_BELT_SYSTEM_JUNIOR_ID,
  BELT_DELETE_BLOCKED_MESSAGE,
  type BeltLevelEditPageData,
  slugifyBeltSystemName,
  type AdminBeltSystem,
  type BeltSystemLevelRow,
  type BeltSystemManagerPageData,
  type BeltTimeUnit,
} from "@/lib/admin-belt-systems.shared";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface BeltSystemRow {
  id: string;
  club_id: string;
  name: string;
  slug: string;
  description: string | null;
  programme_id: string | null;
  default_time_unit: BeltTimeUnit;
  legacy_category: "adult" | "junior" | null;
  sort_order: number;
  is_active: boolean;
}

interface BeltLevelRow extends BeltLevelProgressionRow {
  colour: string | null;
  is_active: boolean;
  belt_system_id: string | null;
}

interface JuniorRequirementTargetRow {
  id: string;
  belt_level_id: string;
  minimum_attendances: number | null;
  required_attendance?: number | null;
  required_weeks: number;
}

function isMissingBeltSystemsTable(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("belt_systems") && message.includes("schema cache");
}

let beltSystemsSchemaAvailable: boolean | null = null;

async function isBeltSystemsSchemaAvailable() {
  if (beltSystemsSchemaAvailable !== null) {
    return beltSystemsSchemaAvailable;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("belt_systems").select("id").limit(1);
  beltSystemsSchemaAvailable = !isMissingBeltSystemsTable(error);
  return beltSystemsSchemaAvailable;
}

function buildLegacyBeltSystems(clubId: string): BeltSystemRow[] {
  return [
    {
      id: LEGACY_BELT_SYSTEM_ADULT_ID,
      club_id: clubId,
      name: "Adult Belts",
      slug: "adult-belts",
      description: "Brazilian Jiu Jitsu adult belt progression.",
      programme_id: null,
      default_time_unit: "months",
      legacy_category: "adult",
      sort_order: 1,
      is_active: true,
    },
    {
      id: LEGACY_BELT_SYSTEM_JUNIOR_ID,
      club_id: clubId,
      name: "Junior Belts",
      slug: "junior-belts",
      description: "Brazilian Jiu Jitsu junior belt progression.",
      programme_id: null,
      default_time_unit: "weeks",
      legacy_category: "junior",
      sort_order: 2,
      is_active: true,
    },
  ];
}

async function loadBeltSystemRows(clubId: string): Promise<BeltSystemRow[]> {
  if (!(await isBeltSystemsSchemaAvailable())) {
    return buildLegacyBeltSystems(clubId);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("belt_systems")
    .select(
      "id, club_id, name, slug, description, programme_id, default_time_unit, legacy_category, sort_order, is_active",
    )
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load belt systems: ${error.message}`);
  }

  return (data ?? []) as BeltSystemRow[];
}

async function loadBeltLevelRowsForClub(clubId: string): Promise<BeltLevelRow[]> {
  const supabase = getSupabaseAdminClient();
  const baseSelect =
    "id, name, stripe_count, sort_order, type, belt_category, colour";
  const extendedSelect = `${baseSelect}, is_active, belt_system_id`;

  let { data, error } = await supabase
    .from("belt_levels")
    .select(extendedSelect)
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true });

  if (error?.message?.includes("is_active") || error?.message?.includes("belt_system_id")) {
    const fallback = await supabase
      .from("belt_levels")
      .select(baseSelect)
      .eq("club_id", clubId)
      .order("sort_order", { ascending: true });

    if (fallback.error) {
      throw new Error(`Failed to load belt levels: ${fallback.error.message}`);
    }

    return ((fallback.data ?? []) as Omit<BeltLevelRow, "is_active" | "belt_system_id">[]).map(
      (row) => ({
        ...row,
        is_active: true,
        belt_system_id: null,
      }),
    );
  }

  if (error) {
    throw new Error(`Failed to load belt levels: ${error.message}`);
  }

  return (data ?? []) as BeltLevelRow[];
}

async function loadJuniorRequirementsByTargetBeltId(clubId: string) {
  const supabase = getSupabaseAdminClient();
  const beltLevels = filterJuniorBeltLevelsForPromotion(await loadBeltLevelsForClub(clubId));
  const beltIds = new Set(beltLevels.map((belt) => belt.id));
  const requirements = new Map<string, JuniorRequirementTargetRow>();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("junior_grading_requirements")
      .select("id, belt_level_id, minimum_attendances, required_weeks")
      .range(from, from + pageSize - 1);

    if (error) {
      break;
    }

    const page = (data ?? []) as JuniorRequirementTargetRow[];

    for (const requirement of page) {
      if (beltIds.has(requirement.belt_level_id)) {
        requirements.set(requirement.belt_level_id, requirement);
      }
    }

    if (page.length < pageSize) {
      return requirements;
    }

    from += pageSize;
  }

  const fromToRequirements = new Map<string, JuniorRequirementTargetRow>();
  from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("junior_grading_requirements")
      .select(
        "id, from_belt_level_id, to_belt_level_id, required_attendance, required_weeks",
      )
      .range(from, from + pageSize - 1);

    if (error) {
      return buildSyntheticJuniorRequirementsByTargetId(beltLevels);
    }

    const page = (data ?? []) as {
      id: string;
      from_belt_level_id: string;
      to_belt_level_id: string;
      required_attendance: number | null;
      required_weeks: number;
    }[];

    for (const requirement of page) {
      if (!beltIds.has(requirement.to_belt_level_id)) {
        continue;
      }

      fromToRequirements.set(requirement.to_belt_level_id, {
        id: requirement.id,
        belt_level_id: requirement.to_belt_level_id,
        minimum_attendances: requirement.required_attendance,
        required_weeks: requirement.required_weeks,
      });
    }

    if (page.length < pageSize) {
      if (fromToRequirements.size > 0) {
        return fromToRequirements;
      }

      if (requirements.size > 0) {
        return requirements;
      }

      return buildSyntheticJuniorRequirementsByTargetId(beltLevels);
    }

    from += pageSize;
  }
}

function buildSyntheticJuniorRequirementsByTargetId(
  beltLevels: BeltLevelProgressionRow[],
) {
  const sorted = [...beltLevels].sort(
    (left, right) => left.sort_order - right.sort_order,
  );
  const requirements = new Map<string, JuniorRequirementTargetRow>();

  for (let index = 1; index < sorted.length; index += 1) {
    const toBelt = sorted[index];
    const baseOrder = Math.floor((sorted[index - 1].sort_order - 1000) / 5);

    requirements.set(toBelt.id, {
      id: `${sorted[index - 1].id}:${toBelt.id}`,
      belt_level_id: toBelt.id,
      minimum_attendances: baseOrder < 3 ? 4 : 8,
      required_weeks: baseOrder < 3 ? 5 : 10,
    });
  }

  return requirements;
}

async function loadGradeAwardCountsByBeltId(beltLevelIds: string[]) {
  if (beltLevelIds.length === 0) {
    return new Map<string, number>();
  }

  const supabase = getSupabaseAdminClient();
  const counts = new Map<string, number>();

  for (const beltLevelId of beltLevelIds) {
    const { count, error } = await supabase
      .from("grade_awards")
      .select("id", { count: "exact", head: true })
      .eq("belt_level_id", beltLevelId);

    if (error) {
      throw new Error(`Failed to count grade awards: ${error.message}`);
    }

    counts.set(beltLevelId, count ?? 0);
  }

  return counts;
}

function resolveSystemBeltLevels(
  system: BeltSystemRow,
  beltLevels: BeltLevelRow[],
) {
  if (system.id === LEGACY_BELT_SYSTEM_ADULT_ID || system.legacy_category === "adult") {
    return beltLevels.filter(
      (belt) =>
        belt.belt_category === "adult" &&
        (belt.belt_system_id === null || belt.belt_system_id === system.id),
    );
  }

  if (system.id === LEGACY_BELT_SYSTEM_JUNIOR_ID || system.legacy_category === "junior") {
    return beltLevels.filter(
      (belt) =>
        belt.belt_category === "junior" &&
        (belt.belt_system_id === null || belt.belt_system_id === system.id),
    );
  }

  return beltLevels.filter((belt) => belt.belt_system_id === system.id);
}

function buildLevelRowsForSystem(input: {
  system: BeltSystemRow;
  beltLevels: BeltLevelRow[];
  adultRequirementsByTargetId: Map<string, GradingRequirementRow>;
  juniorRequirementsByTargetId: Map<string, JuniorRequirementTargetRow>;
  gradeAwardCountsByBeltId: Map<string, number>;
}): BeltSystemLevelRow[] {
  const systemBelts = resolveSystemBeltLevels(input.system, input.beltLevels).sort(
    (left, right) => left.sort_order - right.sort_order,
  );
  const rows: BeltSystemLevelRow[] = [];

  for (let index = 0; index < systemBelts.length; index += 1) {
    const belt = systemBelts[index];
    const nextBelt = systemBelts[index + 1] ?? null;
    const isJunior = input.system.legacy_category === "junior";
    const juniorRequirement = input.juniorRequirementsByTargetId.get(belt.id);
    const adultRequirement = input.adultRequirementsByTargetId.get(belt.id);
    const requirement = isJunior ? juniorRequirement : adultRequirement;

    if (!requirement) {
      continue;
    }

    const awardCount = input.gradeAwardCountsByBeltId.get(belt.id) ?? 0;
    let canDelete = awardCount === 0;
    let deleteBlockedReason: string | null = null;

    if (awardCount > 0) {
      canDelete = false;
      deleteBlockedReason = BELT_DELETE_BLOCKED_MESSAGE;
    }

    rows.push({
      beltLevelId: belt.id,
      requirementId: requirement.id,
      name: formatAdminBeltLabel(belt),
      sortOrder: belt.sort_order,
      requiredAttendance: isJunior
        ? (juniorRequirement?.minimum_attendances ??
            juniorRequirement?.required_attendance ??
            0)
        : (adultRequirement?.minimum_attendances ?? 0),
      requiredTimeValue: isJunior
        ? (juniorRequirement?.required_weeks ?? 0)
        : (adultRequirement?.minimum_months ?? 0),
      requiredTimeUnit: isJunior ? "weeks" : (adultRequirement ? "months" : input.system.default_time_unit),
      nextBeltLabel: nextBelt ? formatAdminBeltLabel(nextBelt) : null,
      colour: belt.colour,
      isActive: belt.is_active ?? true,
      canDelete,
      deleteBlockedReason,
    });
  }

  return rows;
}

export async function getBeltSystemManagerPageData(
  clubId: string,
): Promise<BeltSystemManagerPageData> {
  const [systems, beltLevels, adultRequirementsByTargetId, juniorRequirementsByTargetId] =
    await Promise.all([
      loadBeltSystemRows(clubId),
      loadBeltLevelRowsForClub(clubId),
      loadGradingRequirementsByTargetBeltId(),
      loadJuniorRequirementsByTargetBeltId(clubId),
    ]);

  const relevantBeltIds = beltLevels.map((belt) => belt.id);
  const gradeAwardCountsByBeltId = await loadGradeAwardCountsByBeltId(relevantBeltIds);

  return {
    systems: systems.map((system) => ({
      id: system.id,
      clubId: system.club_id,
      name: system.name,
      slug: system.slug,
      description: system.description,
      programmeId: system.programme_id,
      defaultTimeUnit: system.default_time_unit,
      legacyCategory: system.legacy_category,
      sortOrder: system.sort_order,
      isActive: system.is_active,
      levels: buildLevelRowsForSystem({
        system,
        beltLevels,
        adultRequirementsByTargetId,
        juniorRequirementsByTargetId,
        gradeAwardCountsByBeltId,
      }),
    })),
  };
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
    throw new Error("Belt level not found for this club.");
  }
}

async function assertBeltSystemBelongsToClub(beltSystemId: string, clubId: string) {
  if (
    beltSystemId === LEGACY_BELT_SYSTEM_ADULT_ID ||
    beltSystemId === LEGACY_BELT_SYSTEM_JUNIOR_ID
  ) {
    throw new Error("Apply the belt systems migration before creating belts in this system.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("belt_systems")
    .select("id")
    .eq("id", beltSystemId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify belt system: ${error.message}`);
  }

  if (!data) {
    throw new Error("Belt system not found for this club.");
  }
}

async function loadBeltSystemById(
  clubId: string,
  beltSystemId: string,
): Promise<BeltSystemRow> {
  const systems = await loadBeltSystemRows(clubId);
  const system = systems.find((entry) => entry.id === beltSystemId);

  if (!system) {
    throw new Error("Belt system not found.");
  }

  return system;
}

async function resolveAvailableBeltSystemSlug(clubId: string, preferredSlug: string) {
  const supabase = getSupabaseAdminClient();
  let candidate = preferredSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("belt_systems")
      .select("id")
      .eq("club_id", clubId)
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to validate belt system slug: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }

    candidate = `${preferredSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function createAdminBeltSystem(input: {
  clubId: string;
  name: string;
  description?: string;
  defaultTimeUnit: BeltTimeUnit;
  isActive: boolean;
}) {
  if (!(await isBeltSystemsSchemaAvailable())) {
    throw new Error(
      "Belt systems require the belt_systems migration. Apply supabase/migrations/20260601130000_belt_systems_architecture.sql.",
    );
  }

  const supabase = getSupabaseAdminClient();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Belt system name is required.");
  }

  const slug = await resolveAvailableBeltSystemSlug(
    input.clubId,
    slugifyBeltSystemName(name),
  );

  const { data: existingSystems, error: existingError } = await supabase
    .from("belt_systems")
    .select("sort_order")
    .eq("club_id", input.clubId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to load belt system order: ${existingError.message}`);
  }

  const nextSortOrder =
    ((existingSystems?.[0] as { sort_order: number } | undefined)?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("belt_systems")
    .insert({
      club_id: input.clubId,
      name,
      slug,
      description: input.description?.trim() || null,
      default_time_unit: input.defaultTimeUnit,
      sort_order: nextSortOrder,
      is_active: input.isActive,
    })
    .select(
      "id, club_id, name, slug, description, programme_id, default_time_unit, legacy_category, sort_order, is_active",
    )
    .single();

  if (error) {
    throw new Error(`Failed to create belt system: ${error.message}`);
  }

  return data as BeltSystemRow;
}

export async function updateBeltSystemLevelRequirement(input: {
  clubId: string;
  beltSystemId: string;
  requirementId: string;
  requiredAttendance: number;
  requiredTimeValue: number;
  requiredTimeUnit: BeltTimeUnit;
}) {
  const system = await loadBeltSystemById(input.clubId, input.beltSystemId);

  if (system.legacy_category === "junior") {
    const supabase = getSupabaseAdminClient();
    const { data: requirement, error: loadError } = await supabase
      .from("junior_grading_requirements")
      .select("id, belt_level_id")
      .eq("id", input.requirementId)
      .maybeSingle();

    if (loadError) {
      throw new Error(`Failed to load junior grading requirement: ${loadError.message}`);
    }

    if (!requirement) {
      throw new Error("Junior grading requirement not found.");
    }

    await assertBeltLevelBelongsToClub(requirement.belt_level_id, input.clubId);

    const { error: updateError } = await supabase
      .from("junior_grading_requirements")
      .update({
        minimum_attendances: input.requiredAttendance,
        required_attendance: input.requiredAttendance,
        required_weeks: input.requiredTimeValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.requirementId);

    if (updateError) {
      throw new Error(`Unable to update junior grading requirement: ${updateError.message}`);
    }

    return;
  }

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

  const updatePayload: Record<string, number | string> = {
    minimum_attendances: input.requiredAttendance,
    minimum_months: input.requiredTimeValue,
  };

  if (await isBeltSystemsSchemaAvailable()) {
    updatePayload.required_time_unit = input.requiredTimeUnit;
  }

  const { error: updateError } = await supabase
    .from("grading_requirements")
    .update(updatePayload)
    .eq("id", input.requirementId);

  if (updateError) {
    throw new Error(`Unable to update grading requirement: ${updateError.message}`);
  }
}

export async function createBeltSystemLevel(input: {
  clubId: string;
  beltSystemId: string;
  name: string;
  sortOrder: number;
  requiredAttendance: number;
  requiredTimeValue: number;
  requiredTimeUnit: BeltTimeUnit;
  colour?: string;
  isActive: boolean;
}) {
  if (!(await isBeltSystemsSchemaAvailable())) {
    throw new Error(
      "Adding belts requires the belt systems migration. Apply supabase/migrations/20260601130000_belt_systems_architecture.sql.",
    );
  }

  await assertBeltSystemBelongsToClub(input.beltSystemId, input.clubId);
  const system = await loadBeltSystemById(input.clubId, input.beltSystemId);
  const supabase = getSupabaseAdminClient();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Belt name is required.");
  }

  const beltCategory = system.legacy_category ?? "adult";
  const beltType = beltCategory === "junior" ? "junior" : "belt";

  const { data: beltLevel, error: beltError } = await supabase
    .from("belt_levels")
    .insert({
      club_id: input.clubId,
      belt_system_id: input.beltSystemId,
      name,
      type: beltType,
      colour: input.colour?.trim() || null,
      stripe_count: 0,
      sort_order: input.sortOrder,
      belt_category: beltCategory,
      is_active: input.isActive,
    })
    .select("id")
    .single();

  if (beltError) {
    throw new Error(`Failed to create belt level: ${beltError.message}`);
  }

  if (system.legacy_category === "junior") {
    const { error: requirementError } = await supabase
      .from("junior_grading_requirements")
      .insert({
        belt_level_id: beltLevel.id,
        minimum_attendances: input.requiredAttendance,
        required_weeks: input.requiredTimeValue,
        instructor_approval_required: true,
      });

    if (requirementError) {
      throw new Error(`Failed to create junior grading requirement: ${requirementError.message}`);
    }

    return beltLevel.id;
  }

  const insertPayload: Record<string, number | string | boolean | null> = {
    belt_level_id: beltLevel.id,
    minimum_attendances: input.requiredAttendance,
    minimum_months: input.requiredTimeValue,
    instructor_approval_required: true,
  };

  if (await isBeltSystemsSchemaAvailable()) {
    insertPayload.required_time_unit = input.requiredTimeUnit;
  }

  const { error: requirementError } = await supabase
    .from("grading_requirements")
    .insert(insertPayload);

  if (requirementError) {
    throw new Error(`Failed to create grading requirement: ${requirementError.message}`);
  }

  return beltLevel.id;
}

export async function setBeltSystemLevelActive(input: {
  clubId: string;
  beltLevelId: string;
  isActive: boolean;
}) {
  await assertBeltLevelBelongsToClub(input.beltLevelId, input.clubId);

  if (!(await isBeltSystemsSchemaAvailable())) {
    throw new Error(
      "Marking belts inactive requires the belt systems migration. Apply supabase/migrations/20260601130000_belt_systems_architecture.sql.",
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("belt_levels")
    .update({
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.beltLevelId)
    .eq("club_id", input.clubId);

  if (error) {
    throw new Error(`Failed to update belt level status: ${error.message}`);
  }
}

export async function deleteBeltSystemLevel(input: {
  clubId: string;
  beltLevelId: string;
}) {
  await assertBeltLevelBelongsToClub(input.beltLevelId, input.clubId);

  const gradeAwardCounts = await loadGradeAwardCountsByBeltId([input.beltLevelId]);
  const awardCount = gradeAwardCounts.get(input.beltLevelId) ?? 0;

  if (awardCount > 0) {
    throw new Error(BELT_DELETE_BLOCKED_MESSAGE);
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("belt_levels")
    .delete()
    .eq("id", input.beltLevelId)
    .eq("club_id", input.clubId);

  if (error) {
    throw new Error(`Failed to delete belt level: ${error.message}`);
  }
}

// Backwards-compatible exports for existing belt management callers.
export async function getBeltManagementPageData(clubId: string) {
  const { systems } = await getBeltSystemManagerPageData(clubId);
  const adultSystem = systems.find(
    (system) =>
      system.id === LEGACY_BELT_SYSTEM_ADULT_ID || system.legacyCategory === "adult",
  );
  const juniorSystem = systems.find(
    (system) =>
      system.id === LEGACY_BELT_SYSTEM_JUNIOR_ID || system.legacyCategory === "junior",
  );

  return {
    beltSystems: systems,
    adultRequirements:
      adultSystem?.levels.map((level) => ({
        id: level.requirementId,
        beltLevelId: level.beltLevelId,
        targetBeltLabel: level.name,
        sortOrder: level.sortOrder,
        requiredAttendance: level.requiredAttendance,
        requiredMonths: level.requiredTimeValue,
        colour: level.colour,
        isActive: level.isActive,
        canDelete: level.canDelete,
        deleteBlockedReason: level.deleteBlockedReason,
      })) ?? [],
    juniorRequirements:
      juniorSystem?.levels.map((level) => ({
        id: level.requirementId,
        beltLevelId: level.beltLevelId,
        targetBeltLabel: level.name,
        sortOrder: level.sortOrder,
        requiredAttendance: level.requiredAttendance,
        requiredWeeks: level.requiredTimeValue,
        colour: level.colour,
        isActive: level.isActive,
        canDelete: level.canDelete,
        deleteBlockedReason: level.deleteBlockedReason,
      })) ?? [],
  };
}

export async function updateAdultGradingRequirement(input: {
  clubId: string;
  requirementId: string;
  requiredAttendance: number;
  requiredMonths: number;
}) {
  const systems = await loadBeltSystemRows(input.clubId);
  const adultSystem = systems.find((system) => system.legacy_category === "adult");

  if (!adultSystem) {
    throw new Error("Adult belt system not found.");
  }

  await updateBeltSystemLevelRequirement({
    clubId: input.clubId,
    beltSystemId: adultSystem.id,
    requirementId: input.requirementId,
    requiredAttendance: input.requiredAttendance,
    requiredTimeValue: input.requiredMonths,
    requiredTimeUnit: "months",
  });
}

export async function updateJuniorGradingRequirement(input: {
  clubId: string;
  requirementId: string;
  requiredAttendance: number;
  requiredWeeks: number;
}) {
  const systems = await loadBeltSystemRows(input.clubId);
  const juniorSystem = systems.find((system) => system.legacy_category === "junior");

  if (!juniorSystem) {
    throw new Error("Junior belt system not found.");
  }

  await updateBeltSystemLevelRequirement({
    clubId: input.clubId,
    beltSystemId: juniorSystem.id,
    requirementId: input.requirementId,
    requiredAttendance: input.requiredAttendance,
    requiredTimeValue: input.requiredWeeks,
    requiredTimeUnit: "weeks",
  });
}

export async function getBeltLevelEditPageData(
  clubId: string,
  beltLevelId: string,
): Promise<BeltLevelEditPageData> {
  const { systems } = await getBeltSystemManagerPageData(clubId);

  for (const system of systems) {
    const level = system.levels.find((entry) => entry.beltLevelId === beltLevelId);

    if (level) {
      return {
        beltLevelId: level.beltLevelId,
        requirementId: level.requirementId,
        beltSystemId: system.id,
        beltSystemName: system.name,
        legacyCategory: system.legacyCategory,
        name: level.name,
        sortOrder: level.sortOrder,
        requiredAttendance: level.requiredAttendance,
        requiredTimeValue: level.requiredTimeValue,
        requiredTimeUnit: level.requiredTimeUnit,
        colour: level.colour,
        isActive: level.isActive,
        nextBeltLabel: level.nextBeltLabel,
        canDelete: level.canDelete,
        deleteBlockedReason: level.deleteBlockedReason,
      };
    }
  }

  throw new Error("Belt not found.");
}

export async function updateBeltLevelDetails(input: {
  clubId: string;
  beltLevelId: string;
  beltSystemId: string;
  requirementId: string;
  name: string;
  sortOrder: number;
  requiredAttendance: number;
  requiredTimeValue: number;
  requiredTimeUnit: BeltTimeUnit;
  colour?: string;
}) {
  await assertBeltLevelBelongsToClub(input.beltLevelId, input.clubId);

  const name = input.name.trim();

  if (!name) {
    throw new Error("Belt name is required.");
  }

  const supabase = getSupabaseAdminClient();
  const beltUpdate: Record<string, string | number | null> = {
    name,
    sort_order: input.sortOrder,
    colour: input.colour?.trim() || null,
  };

  const { error: beltError } = await supabase
    .from("belt_levels")
    .update(beltUpdate)
    .eq("id", input.beltLevelId)
    .eq("club_id", input.clubId);

  if (beltError) {
    throw new Error(`Failed to update belt level: ${beltError.message}`);
  }

  await updateBeltSystemLevelRequirement({
    clubId: input.clubId,
    beltSystemId: input.beltSystemId,
    requirementId: input.requirementId,
    requiredAttendance: input.requiredAttendance,
    requiredTimeValue: input.requiredTimeValue,
    requiredTimeUnit: input.requiredTimeUnit,
  });
}

export type {
  AdminBeltSystem,
  BeltLevelEditPageData,
  BeltSystemLevelRow,
  BeltSystemManagerPageData,
} from "@/lib/admin-belt-systems.shared";
