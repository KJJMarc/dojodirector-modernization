import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import {
  isAdultBeltCategory,
  isJuniorBeltCategory,
  isJuniorBeltLevel,
  sortAdultBeltLevels,
  sortBeltLevelsBySortOrder,
  toBeltLevelOptions,
  type BeltLevelOption,
} from "@/lib/admin-belt-levels.shared";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface BeltLevelRow {
  id: string;
  name: string;
  stripe_count: number | null;
  sort_order: number;
  type: string | null;
  belt_category: string | null;
}

interface GradeAwardRow {
  belt_level_id: string | null;
  awarded_at: string;
}

export interface AdminChangeBeltPageData {
  userId: string;
  studentName: string;
  currentBeltLabel: string;
  currentBeltAwardedAt: string | null;
  adultBeltOptions: BeltLevelOption[];
  juniorBeltOptions: BeltLevelOption[];
}

async function assertClubMember(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }
}

async function loadStudentName(userId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load student: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  return getStudentFullName(data.first_name, data.last_name);
}

async function loadLatestGradeAward(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select("belt_level_id, awarded_at")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .order("awarded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load current belt: ${error.message}`);
  }

  return (data as GradeAwardRow | null) ?? null;
}

async function loadBeltLevelById(beltLevelId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order, type, belt_category")
    .eq("id", beltLevelId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load belt level: ${error.message}`);
  }

  return (data as BeltLevelRow | null) ?? null;
}

function isAdultClubBeltLevel(belt: BeltLevelRow) {
  if (isJuniorBeltCategory(belt.belt_category)) {
    return false;
  }

  if (isAdultBeltCategory(belt.belt_category)) {
    return true;
  }

  return !isJuniorBeltLevel(belt);
}

function isJuniorClubBeltLevel(belt: BeltLevelRow) {
  if (isJuniorBeltCategory(belt.belt_category)) {
    return true;
  }

  if (isAdultBeltCategory(belt.belt_category)) {
    return false;
  }

  return isJuniorBeltLevel(belt);
}

async function loadClubBeltLevelOptions(clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order, type, belt_category")
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Failed to load belt levels: ${error.message}`);
  }

  const belts = (data ?? []) as BeltLevelRow[];
  const adultBelts = belts.filter(isAdultClubBeltLevel);
  const juniorBelts = belts.filter(isJuniorClubBeltLevel);

  return {
    adultBeltOptions: toBeltLevelOptions(sortAdultBeltLevels(adultBelts)),
    juniorBeltOptions: toBeltLevelOptions(sortBeltLevelsBySortOrder(juniorBelts)),
  };
}

function parseAwardedAt(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Awarded date must use YYYY-MM-DD format.");
  }

  return value;
}

export async function getAdminChangeBeltPageData(
  userId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminChangeBeltPageData> {
  await assertClubMember(userId, clubId);

  const [studentName, latestAward, beltOptions] = await Promise.all([
    loadStudentName(userId),
    loadLatestGradeAward(userId, clubId),
    loadClubBeltLevelOptions(clubId),
  ]);

  const currentBelt = latestAward?.belt_level_id
    ? await loadBeltLevelById(latestAward.belt_level_id)
    : null;

  return {
    userId,
    studentName,
    currentBeltLabel: formatAdminBeltLabel(currentBelt),
    currentBeltAwardedAt: latestAward?.awarded_at ?? null,
    adultBeltOptions: beltOptions.adultBeltOptions,
    juniorBeltOptions: beltOptions.juniorBeltOptions,
  };
}

export async function adminAwardBeltLevel(input: {
  userId: string;
  beltLevelId: string;
  awardedAt: string;
  notes?: string;
  clubId?: string;
}) {
  const clubId = input.clubId ?? ACTIVE_CLUB_ID;
  const awardedAt = parseAwardedAt(input.awardedAt);

  await assertClubMember(input.userId, clubId);

  const supabase = getSupabaseAdminClient();

  const { data: beltLevel, error: beltError } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, type, belt_category")
    .eq("id", input.beltLevelId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (beltError) {
    throw new Error(`Unable to load belt level: ${beltError.message}`);
  }

  if (!beltLevel) {
    throw new Error("Selected belt level was not found for this club.");
  }

  const notes = input.notes?.trim() ?? "";

  const { error: insertError } = await supabase.from("grade_awards").insert({
    user_id: input.userId,
    club_id: clubId,
    belt_level_id: input.beltLevelId,
    awarded_at: awardedAt,
    notes: notes.length > 0 ? notes : null,
  });

  if (insertError) {
    throw new Error(`Unable to award belt level: ${insertError.message}`);
  }
}
