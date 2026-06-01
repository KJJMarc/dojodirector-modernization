import "server-only";

import {
  loadLatestGradeAwardsByUserId,
  loadPromotionFlagsByUserId,
} from "@/lib/admin-belt-promotion.server";
import { loadBjjAttendanceSummariesByUserId } from "@/lib/admin-bjj-attendance.server";
import type { BjjAttendanceSummary } from "@/lib/admin-bjj-attendance.shared";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  formatAdminBeltLabel,
  type AdminStudent,
} from "@/lib/admin-students";
import {
  loadAdminStudentProfileRowsByIds,
  loadClubMembershipRows,
} from "@/lib/admin-club-memberships.server";
import type { AdminProgramme } from "@/lib/admin-programmes.shared";
import {
  loadProgrammeMembershipUserIds,
  requireClubBjjProgramme,
} from "@/lib/admin-programmes.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
  programme?: Pick<AdminProgramme, "id" | "beltsRanksEnabled" | "promotionCandidatesEnabled">,
): Promise<AdminStudent[]> {
  const membershipRows = await loadClubMembershipRows(clubId);

  if (membershipRows.length === 0) {
    return [];
  }

  let scopedMembershipRows = membershipRows;

  if (programme) {
    const programmeUserIds = new Set(
      await loadProgrammeMembershipUserIds(programme.id),
    );

    scopedMembershipRows = membershipRows.filter((membership) =>
      programmeUserIds.has(membership.user_id),
    );
  }

  if (scopedMembershipRows.length === 0) {
    return [];
  }

  const userIds = Array.from(
    new Set(scopedMembershipRows.map((membership) => membership.user_id)),
  );

  const userById = await loadAdminStudentProfileRowsByIds(userIds);
  const useBjjEnrichment = programme?.beltsRanksEnabled !== false;

  let latestGradeAwardByUserId = new Map<string, GradeAwardRow>();
  let bjjAttendanceByUserId = new Map<string, BjjAttendanceSummary>();
  let promotionFlags = new Map<string, boolean>();
  let beltLevelById = new Map<string, BeltLevelRow>();

  if (useBjjEnrichment) {
    latestGradeAwardByUserId = await loadLatestGradeAwardsByUserId(
      userIds,
      clubId,
    );
    const awardedAtByUserId = buildCurrentLevelAwardedAtByUserId(
      latestGradeAwardByUserId,
    );

    bjjAttendanceByUserId = await loadBjjAttendanceSummariesByUserId(
      userIds,
      clubId,
      awardedAtByUserId,
    );

    if (programme?.promotionCandidatesEnabled !== false) {
      promotionFlags = await loadPromotionFlagsByUserId(
        userIds,
        clubId,
        latestGradeAwardByUserId,
        bjjAttendanceByUserId,
      );
    }

    const beltLevelIds = Array.from(
      new Set(
        Array.from(latestGradeAwardByUserId.values())
          .map((award) => award.belt_level_id)
          .filter((beltLevelId): beltLevelId is string => Boolean(beltLevelId)),
      ),
    );

    beltLevelById = await getBeltLevelsById(beltLevelIds);
  }

  const students: AdminStudent[] = [];

  for (const membership of scopedMembershipRows) {
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
      beltLabel: useBjjEnrichment ? formatAdminBeltLabel(beltLevel) : "—",
      beltSortOrder: useBjjEnrichment ? (beltLevel?.sort_order ?? null) : null,
      attendanceTotal: bjjAttendance?.lifetimeBjjAttendanceCount ?? 0,
      considerPromotion:
        useBjjEnrichment && promotionFlags.get(user.id) === true,
    });
  }

  return students;
}

export async function getBjjProgrammeStudents(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminStudent[]> {
  const bjjProgramme = await requireClubBjjProgramme(clubId);
  return getClubStudents(clubId, bjjProgramme);
}
