import "server-only";

import {
  compareGradeAwardDates,
  type BeltLevelProgressionRow,
} from "@/lib/admin-belt-promotion.shared";
import {
  loadBeltLevelsForClub,
  loadLatestGradeAwardsByUserId,
} from "@/lib/admin-belt-promotion.server";
import {
  loadAdminStudentProfileRowsByIds,
  loadClubMembershipRows,
} from "@/lib/admin-club-memberships.server";
import { isJuniorBeltLevel } from "@/lib/admin-belt-levels.shared";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import {
  formatLastUpdatedLabel,
  formatPromotionDateLabel,
  JUNIOR_BELT_RANKINGS_RECENT_PROMOTION_DAYS,
  sortStudentsBySurnameFirstName,
  type JuniorBeltRankingGroup,
  type JuniorBeltRankingStudent,
  type JuniorBeltRankingsPageData,
  type JuniorBeltRecentPromotion,
} from "@/lib/junior-belt-rankings.shared";
import { getStudentFullName } from "@/lib/attendance";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface GradeAwardRow {
  id: string;
  user_id: string;
  belt_level_id: string | null;
  awarded_at: string;
}

const SUPABASE_PAGE_SIZE = 1000;
const SUPABASE_IN_BATCH_SIZE = 100;

function chunkIds<T>(ids: T[], batchSize = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < ids.length; index += batchSize) {
    chunks.push(ids.slice(index, index + batchSize));
  }

  return chunks;
}

async function loadActiveMemberUserIds(clubId: string) {
  const memberships = await loadClubMembershipRows(clubId);

  return memberships
    .filter((membership) => isActiveMembershipStatus(membership.status))
    .map((membership) => membership.user_id);
}

function getRecentPromotionCutoffDate(referenceDate = new Date()) {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - JUNIOR_BELT_RANKINGS_RECENT_PROMOTION_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

function sortGradeAwardsNewestFirst(awards: GradeAwardRow[]) {
  return [...awards].sort((left, right) => {
    const dateCompare = compareGradeAwardDates(right.awarded_at, left.awarded_at);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.id.localeCompare(left.id);
  });
}

function findPreviousGradeAward(
  userAwards: GradeAwardRow[],
  currentAward: GradeAwardRow,
): GradeAwardRow | null {
  const sorted = sortGradeAwardsNewestFirst(userAwards);
  const currentIndex = sorted.findIndex((award) => award.id === currentAward.id);

  if (currentIndex < 0) {
    return null;
  }

  return sorted[currentIndex + 1] ?? null;
}

function isJuniorBeltLevelId(
  beltLevelId: string | null | undefined,
  juniorBeltLevelById: Map<string, BeltLevelProgressionRow>,
) {
  if (!beltLevelId) {
    return false;
  }

  return juniorBeltLevelById.has(beltLevelId);
}

async function loadGradeAwardsForUsers(
  userIds: string[],
  clubId: string,
): Promise<GradeAwardRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const allAwards: GradeAwardRow[] = [];

  for (const userIdBatch of chunkIds(userIds)) {
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("grade_awards")
        .select("id, user_id, belt_level_id, awarded_at")
        .eq("club_id", clubId)
        .in("user_id", userIdBatch)
        .order("awarded_at", { ascending: false })
        .range(from, from + SUPABASE_PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Failed to load grade awards: ${error.message}`);
      }

      const page = (data ?? []) as GradeAwardRow[];
      allAwards.push(...page);

      if (page.length < SUPABASE_PAGE_SIZE) {
        break;
      }

      from += SUPABASE_PAGE_SIZE;
    }
  }

  return allAwards;
}

async function loadRecentGradeAwards(
  clubId: string,
  cutoffDate: Date,
): Promise<GradeAwardRow[]> {
  const supabase = getSupabaseAdminClient();
  const awards: GradeAwardRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("grade_awards")
      .select("id, user_id, belt_level_id, awarded_at")
      .eq("club_id", clubId)
      .gte("awarded_at", cutoffDate.toISOString())
      .order("awarded_at", { ascending: false })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load recent grade awards: ${error.message}`);
    }

    const page = (data ?? []) as GradeAwardRow[];
    awards.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return awards;
}

function buildStudentProfilesByUserId(
  userIds: string[],
  usersById: Awaited<ReturnType<typeof loadAdminStudentProfileRowsByIds>>,
) {
  const profilesByUserId = new Map<
    string,
    Pick<JuniorBeltRankingStudent, "fullName" | "firstName" | "lastName">
  >();

  for (const userId of userIds) {
    const user = usersById.get(userId);
    const firstName = user?.first_name?.trim() ?? "";
    const lastName = user?.last_name?.trim() ?? "";

    profilesByUserId.set(userId, {
      firstName,
      lastName,
      fullName: getStudentFullName(user?.first_name ?? null, user?.last_name ?? null),
    });
  }

  return profilesByUserId;
}

function buildJuniorBeltRankingGroups(input: {
  activeMemberUserIds: Set<string>;
  latestAwardByUserId: Map<
    string,
    { belt_level_id: string | null; awarded_at: string }
  >;
  juniorBeltLevelById: Map<string, BeltLevelProgressionRow>;
  studentProfilesByUserId: Map<
    string,
    Pick<JuniorBeltRankingStudent, "fullName" | "firstName" | "lastName">
  >;
}): JuniorBeltRankingGroup[] {
  const groupsByBeltLevelId = new Map<
    string,
    { beltLevel: BeltLevelProgressionRow; students: JuniorBeltRankingStudent[] }
  >();

  for (const userId of Array.from(input.activeMemberUserIds)) {
    const latestAward = input.latestAwardByUserId.get(userId);
    const beltLevelId = latestAward?.belt_level_id;

    if (!isJuniorBeltLevelId(beltLevelId, input.juniorBeltLevelById)) {
      continue;
    }

    const beltLevel = input.juniorBeltLevelById.get(beltLevelId!)!;
    const profile =
      input.studentProfilesByUserId.get(userId) ??
      ({
        firstName: "",
        lastName: "",
        fullName: "Unknown student",
      } satisfies Pick<
        JuniorBeltRankingStudent,
        "fullName" | "firstName" | "lastName"
      >);

    const student: JuniorBeltRankingStudent = {
      userId,
      fullName: profile.fullName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      currentRankLabel: formatAdminBeltLabel(beltLevel),
    };

    const existing = groupsByBeltLevelId.get(beltLevel.id);

    if (existing) {
      existing.students.push(student);
      continue;
    }

    groupsByBeltLevelId.set(beltLevel.id, {
      beltLevel,
      students: [student],
    });
  }

  return Array.from(groupsByBeltLevelId.values())
    .map(({ beltLevel, students }) => ({
      beltLevelId: beltLevel.id,
      rankLabel: formatAdminBeltLabel(beltLevel),
      beltSortOrder: beltLevel.sort_order,
      students: sortStudentsBySurnameFirstName(students),
    }))
    .sort((left, right) => {
      if (left.beltSortOrder !== right.beltSortOrder) {
        return right.beltSortOrder - left.beltSortOrder;
      }

      return left.rankLabel.localeCompare(right.rankLabel, "en", {
        sensitivity: "base",
      });
    });
}

function groupGradeAwardsByUserId(awards: GradeAwardRow[]) {
  const awardsByUserId = new Map<string, GradeAwardRow[]>();

  for (const award of awards) {
    const userAwards = awardsByUserId.get(award.user_id) ?? [];
    userAwards.push(award);
    awardsByUserId.set(award.user_id, userAwards);
  }

  return awardsByUserId;
}

function buildRecentPromotions(input: {
  recentAwards: GradeAwardRow[];
  awardsByUserId: Map<string, GradeAwardRow[]>;
  activeMemberUserIds: Set<string>;
  allBeltLevelById: Map<string, BeltLevelProgressionRow>;
  juniorBeltLevelById: Map<string, BeltLevelProgressionRow>;
  studentProfilesByUserId: Map<
    string,
    Pick<JuniorBeltRankingStudent, "fullName">
  >;
}): JuniorBeltRecentPromotion[] {
  const promotions: JuniorBeltRecentPromotion[] = [];

  for (const award of input.recentAwards) {
    if (!input.activeMemberUserIds.has(award.user_id)) {
      continue;
    }

    if (!isJuniorBeltLevelId(award.belt_level_id, input.juniorBeltLevelById)) {
      continue;
    }

    const userAwards = input.awardsByUserId.get(award.user_id) ?? [];
    const previousAward = findPreviousGradeAward(userAwards, award);

    if (!previousAward) {
      continue;
    }

    const profile =
      input.studentProfilesByUserId.get(award.user_id) ??
      ({
        fullName: "Unknown student",
      } as Pick<JuniorBeltRankingStudent, "fullName">);

    promotions.push({
      userId: award.user_id,
      studentName: profile.fullName,
      previousRankLabel: previousAward.belt_level_id
        ? formatAdminBeltLabel(
            input.allBeltLevelById.get(previousAward.belt_level_id) ?? null,
          )
        : "Not set",
      newRankLabel: award.belt_level_id
        ? formatAdminBeltLabel(
            input.allBeltLevelById.get(award.belt_level_id) ?? null,
          )
        : "Not set",
      promotionDateLabel: formatPromotionDateLabel(award.awarded_at),
      promotionDateKey: normalizeToDateKey(award.awarded_at) ?? award.awarded_at,
    });
  }

  return promotions.sort((left, right) =>
    right.promotionDateKey.localeCompare(left.promotionDateKey),
  );
}

export async function getJuniorBeltRankingsPageData(
  clubId: string,
  clubName: string,
): Promise<JuniorBeltRankingsPageData> {
  const activeMemberUserIds = await loadActiveMemberUserIds(clubId);
  const activeMemberUserIdSet = new Set(activeMemberUserIds);

  const allBeltLevels = await loadBeltLevelsForClub(clubId);
  const allBeltLevelById = new Map(
    allBeltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );
  const juniorBeltLevels = allBeltLevels.filter((beltLevel) =>
    isJuniorBeltLevel(beltLevel),
  );
  const juniorBeltLevelById = new Map(
    juniorBeltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );

  const latestAwardByUserId = await loadLatestGradeAwardsByUserId(
    activeMemberUserIds,
    clubId,
  );

  const studentProfilesByUserId = buildStudentProfilesByUserId(
    activeMemberUserIds,
    await loadAdminStudentProfileRowsByIds(activeMemberUserIds),
  );

  const beltGroups = buildJuniorBeltRankingGroups({
    activeMemberUserIds: activeMemberUserIdSet,
    latestAwardByUserId,
    juniorBeltLevelById,
    studentProfilesByUserId,
  });

  const cutoffDate = getRecentPromotionCutoffDate();
  const recentAwards = await loadRecentGradeAwards(clubId, cutoffDate);
  const recentPromotionUserIds = Array.from(
    new Set(recentAwards.map((award) => award.user_id)),
  );
  const promotionHistoryAwards = await loadGradeAwardsForUsers(
    recentPromotionUserIds,
    clubId,
  );
  const promotionStudentProfilesByUserId = buildStudentProfilesByUserId(
    recentPromotionUserIds,
    await loadAdminStudentProfileRowsByIds(recentPromotionUserIds),
  );

  const recentPromotions = buildRecentPromotions({
    recentAwards,
    awardsByUserId: groupGradeAwardsByUserId(promotionHistoryAwards),
    activeMemberUserIds: activeMemberUserIdSet,
    allBeltLevelById,
    juniorBeltLevelById,
    studentProfilesByUserId: promotionStudentProfilesByUserId,
  });

  return {
    clubName,
    beltGroups,
    recentPromotions,
    lastUpdatedLabel: formatLastUpdatedLabel(),
  };
}
