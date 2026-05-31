import "server-only";

import {
  loadLatestGradeAwardsByUserId,
  loadPromotionFlagsByUserId,
} from "@/lib/admin-belt-promotion.server";
import { loadBjjAttendanceSummariesByUserId } from "@/lib/admin-bjj-attendance.server";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  formatAdminBeltLabel,
  type AdminStudent,
} from "@/lib/admin-students";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface MembershipRow {
  user_id: string;
  role: string | null;
  status: string | null;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface GradeAwardRow {
  user_id: string;
  belt_level_id: string | null;
  awarded_at: string;
}

interface BeltLevelRow {
  id: string;
  name: string;
  stripe_count: number | null;
  sort_order: number;
}

async function getBeltLevelsById(beltLevelIds: string[]) {
  if (beltLevelIds.length === 0) {
    return new Map<string, BeltLevelRow>();
  }

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order")
    .in("id", beltLevelIds);

  if (error) {
    throw new Error(`Failed to load belt levels: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as BeltLevelRow[]).map((beltLevel) => [beltLevel.id, beltLevel]),
  );
}

function buildCurrentLevelAwardedAtByUserId(
  latestGradeAwardByUserId: Map<string, GradeAwardRow>,
) {
  const awardedAtByUserId = new Map<string, string | null>();

  for (const [userId, award] of Array.from(latestGradeAwardByUserId)) {
    awardedAtByUserId.set(userId, normalizeToDateKey(award.awarded_at));
  }

  return awardedAtByUserId;
}

export async function getClubStudents(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminStudent[]> {
  const supabase = getSupabaseAdminClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("user_id, role, status")
    .eq("club_id", clubId);

  if (membershipsError) {
    throw new Error(`Failed to load students: ${membershipsError.message}`);
  }

  const membershipRows = (memberships ?? []) as MembershipRow[];

  if (membershipRows.length === 0) {
    return [];
  }

  const userIds = Array.from(
    new Set(membershipRows.map((membership) => membership.user_id)),
  );

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  if (usersError) {
    throw new Error(`Failed to load student profiles: ${usersError.message}`);
  }

  const latestGradeAwardByUserId = await loadLatestGradeAwardsByUserId(
    userIds,
    clubId,
  );
  const awardedAtByUserId = buildCurrentLevelAwardedAtByUserId(
    latestGradeAwardByUserId,
  );

  const bjjAttendanceByUserId = await loadBjjAttendanceSummariesByUserId(
    userIds,
    clubId,
    awardedAtByUserId,
  );

  const promotionFlags = await loadPromotionFlagsByUserId(
    userIds,
    clubId,
    latestGradeAwardByUserId,
    bjjAttendanceByUserId,
  );

  const beltLevelIds = Array.from(
    new Set(
      Array.from(latestGradeAwardByUserId.values())
        .map((award) => award.belt_level_id)
        .filter((beltLevelId): beltLevelId is string => Boolean(beltLevelId)),
    ),
  );

  const beltLevelById = await getBeltLevelsById(beltLevelIds);

  const userById = new Map(
    ((users ?? []) as UserRow[]).map((user) => [user.id, user]),
  );

  const students: AdminStudent[] = [];

  for (const membership of membershipRows) {
    const user = userById.get(membership.user_id);

    if (!user) {
      continue;
    }

    const latestAward = latestGradeAwardByUserId.get(user.id);
    const beltLevel = latestAward?.belt_level_id
      ? beltLevelById.get(latestAward.belt_level_id)
      : null;
    const bjjAttendance = bjjAttendanceByUserId.get(user.id);

    students.push({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: membership.role,
      beltLabel: formatAdminBeltLabel(beltLevel),
      beltSortOrder: beltLevel?.sort_order ?? null,
      attendanceTotal: bjjAttendance?.lifetimeBjjAttendanceCount ?? 0,
      considerPromotion: promotionFlags.get(user.id) === true,
    });
  }

  return students;
}
