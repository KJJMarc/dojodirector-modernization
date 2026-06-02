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
  ADULT_BELT_RANKINGS_RECENT_PROMOTION_DAYS,
  getBlackBeltDegreeSortKey,
  getBeltStripeCount,
  getMajorAdultBeltColor,
  getMajorAdultBeltSectionLabel,
  MAJOR_ADULT_BELT_COLORS,
  shouldIncludeRankedStudent,
  sortStudentsBySurnameFirstName,
  formatPromotionDateLabel,
  formatLastUpdatedLabel,
  type AdultBeltRankingDegreeGroup,
  type AdultBeltRankingGroup,
  type AdultBeltRankingStripeGroup,
  type AdultBeltRankingStudent,
  type AdultBeltRankingsPageData,
  type AdultBeltRecentPromotion,
  type MajorAdultBeltColor,
} from "@/lib/adult-belt-rankings.shared";
import { getStudentFullName } from "@/lib/attendance";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { ACTIVE_CLUB_ID, ACTIVE_CLUB_NAME } from "@/lib/branding";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface GradeAwardRow {
  id: string;
  user_id: string;
  belt_level_id: string | null;
  awarded_at: string;
}

interface RankedStudentEntry {
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  currentRankLabel: string;
  beltLevel: BeltLevelProgressionRow;
  majorColor: MajorAdultBeltColor;
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
  cutoff.setDate(cutoff.getDate() - ADULT_BELT_RANKINGS_RECENT_PROMOTION_DAYS);
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

function isAdultBeltLevel(
  beltLevelId: string | null | undefined,
  adultBeltLevelById: Map<string, BeltLevelProgressionRow>,
) {
  if (!beltLevelId) {
    return false;
  }

  return adultBeltLevelById.has(beltLevelId);
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
    Pick<AdultBeltRankingStudent, "fullName" | "firstName" | "lastName">
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

function buildRankedStudentEntries(input: {
  activeMemberUserIds: Set<string>;
  latestAwardByUserId: Map<
    string,
    { belt_level_id: string | null; awarded_at: string }
  >;
  adultBeltLevelById: Map<string, BeltLevelProgressionRow>;
  studentProfilesByUserId: Map<
    string,
    Pick<AdultBeltRankingStudent, "fullName" | "firstName" | "lastName">
  >;
}): RankedStudentEntry[] {
  const entries: RankedStudentEntry[] = [];

  for (const userId of Array.from(input.activeMemberUserIds)) {
    const latestAward = input.latestAwardByUserId.get(userId);
    const beltLevelId = latestAward?.belt_level_id;

    if (!isAdultBeltLevel(beltLevelId, input.adultBeltLevelById)) {
      continue;
    }

    const beltLevel = input.adultBeltLevelById.get(beltLevelId!)!;
    const majorColor = getMajorAdultBeltColor(beltLevel.name, beltLevel.type);

    if (!majorColor) {
      continue;
    }

    const stripeCount = getBeltStripeCount(beltLevel);

    if (!shouldIncludeRankedStudent(majorColor, stripeCount)) {
      continue;
    }

    const profile =
      input.studentProfilesByUserId.get(userId) ??
      ({
        firstName: "",
        lastName: "",
        fullName: "Unknown student",
      } satisfies Pick<
        AdultBeltRankingStudent,
        "fullName" | "firstName" | "lastName"
      >);

    entries.push({
      userId,
      fullName: profile.fullName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      currentRankLabel: formatAdminBeltLabel(beltLevel),
      beltLevel,
      majorColor,
    });
  }

  return entries;
}

function buildBlackBeltDegreeGroups(
  entries: RankedStudentEntry[],
): AdultBeltRankingDegreeGroup[] {
  const groupsByBeltLevelId = new Map<
    string,
    { beltLevel: BeltLevelProgressionRow; students: AdultBeltRankingStudent[] }
  >();

  for (const entry of entries) {
    const existing = groupsByBeltLevelId.get(entry.beltLevel.id);
    const student: AdultBeltRankingStudent = {
      userId: entry.userId,
      fullName: entry.fullName,
      firstName: entry.firstName,
      lastName: entry.lastName,
      currentRankLabel: entry.currentRankLabel,
    };

    if (existing) {
      existing.students.push(student);
      continue;
    }

    groupsByBeltLevelId.set(entry.beltLevel.id, {
      beltLevel: entry.beltLevel,
      students: [student],
    });
  }

  const degreeGroups = Array.from(groupsByBeltLevelId.values()).map(
    ({ beltLevel, students }) => ({
      beltLevelId: beltLevel.id,
      rankLabel: formatAdminBeltLabel(beltLevel),
      degreeSortKey: getBlackBeltDegreeSortKey(beltLevel.name, beltLevel.type),
      beltSortOrder: beltLevel.sort_order,
      students: sortStudentsBySurnameFirstName(students),
    }),
  );

  return degreeGroups.sort((left, right) => {
    if (left.degreeSortKey !== right.degreeSortKey) {
      return right.degreeSortKey - left.degreeSortKey;
    }

    if (left.beltSortOrder !== right.beltSortOrder) {
      return right.beltSortOrder - left.beltSortOrder;
    }

    return left.rankLabel.localeCompare(right.rankLabel, "en", {
      sensitivity: "base",
    });
  });
}

function buildColoredBeltStripeGroups(
  entries: RankedStudentEntry[],
): AdultBeltRankingStripeGroup[] {
  const groupsByBeltLevelId = new Map<
    string,
    { beltLevel: BeltLevelProgressionRow; students: AdultBeltRankingStudent[] }
  >();

  for (const entry of entries) {
    const existing = groupsByBeltLevelId.get(entry.beltLevel.id);
    const student: AdultBeltRankingStudent = {
      userId: entry.userId,
      fullName: entry.fullName,
      firstName: entry.firstName,
      lastName: entry.lastName,
      currentRankLabel: entry.currentRankLabel,
    };

    if (existing) {
      existing.students.push(student);
      continue;
    }

    groupsByBeltLevelId.set(entry.beltLevel.id, {
      beltLevel: entry.beltLevel,
      students: [student],
    });
  }

  const stripeGroups = Array.from(groupsByBeltLevelId.values()).map(
    ({ beltLevel, students }) => ({
      beltLevelId: beltLevel.id,
      rankLabel: formatAdminBeltLabel(beltLevel),
      stripeCount: getBeltStripeCount(beltLevel),
      beltSortOrder: beltLevel.sort_order,
      students: sortStudentsBySurnameFirstName(students),
    }),
  );

  return stripeGroups.sort((left, right) => {
    if (left.stripeCount !== right.stripeCount) {
      return right.stripeCount - left.stripeCount;
    }

    if (left.beltSortOrder !== right.beltSortOrder) {
      return right.beltSortOrder - left.beltSortOrder;
    }

    return left.rankLabel.localeCompare(right.rankLabel, "en", {
      sensitivity: "base",
    });
  });
}

function buildAdultBeltRankingGroups(entries: RankedStudentEntry[]): AdultBeltRankingGroup[] {
  const entriesByColor = new Map<MajorAdultBeltColor, RankedStudentEntry[]>();

  for (const entry of entries) {
    const colorEntries = entriesByColor.get(entry.majorColor) ?? [];
    colorEntries.push(entry);
    entriesByColor.set(entry.majorColor, colorEntries);
  }

  const groups: AdultBeltRankingGroup[] = [];

  for (const beltColor of MAJOR_ADULT_BELT_COLORS) {
    const colorEntries = entriesByColor.get(beltColor) ?? [];

    if (colorEntries.length === 0) {
      continue;
    }

    if (beltColor === "black") {
      groups.push({
        beltColor,
        sectionLabel: getMajorAdultBeltSectionLabel(beltColor),
        totalStudents: colorEntries.length,
        degreeGroups: buildBlackBeltDegreeGroups(colorEntries),
        stripeGroups: null,
      });
      continue;
    }

    const stripeGroups = buildColoredBeltStripeGroups(colorEntries);

    if (stripeGroups.length === 0) {
      continue;
    }

    groups.push({
      beltColor,
      sectionLabel: getMajorAdultBeltSectionLabel(beltColor),
      totalStudents: stripeGroups.reduce(
        (total, group) => total + group.students.length,
        0,
      ),
      degreeGroups: null,
      stripeGroups,
    });
  }

  return groups;
}

function buildRecentPromotions(input: {
  recentAwards: GradeAwardRow[];
  awardsByUserId: Map<string, GradeAwardRow[]>;
  activeMemberUserIds: Set<string>;
  allBeltLevelById: Map<string, BeltLevelProgressionRow>;
  studentProfilesByUserId: Map<
    string,
    Pick<AdultBeltRankingStudent, "fullName" | "firstName" | "lastName">
  >;
}): AdultBeltRecentPromotion[] {
  const promotions: AdultBeltRecentPromotion[] = [];

  for (const award of input.recentAwards) {
    if (!input.activeMemberUserIds.has(award.user_id)) {
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
      } as Pick<AdultBeltRankingStudent, "fullName">);

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

function groupGradeAwardsByUserId(awards: GradeAwardRow[]) {
  const awardsByUserId = new Map<string, GradeAwardRow[]>();

  for (const award of awards) {
    const userAwards = awardsByUserId.get(award.user_id) ?? [];
    userAwards.push(award);
    awardsByUserId.set(award.user_id, userAwards);
  }

  return awardsByUserId;
}

export async function getAdultBeltRankingsPageData(
  clubId: string = ACTIVE_CLUB_ID,
  clubName: string = ACTIVE_CLUB_NAME,
): Promise<AdultBeltRankingsPageData> {
  const activeMemberUserIds = await loadActiveMemberUserIds(clubId);
  const activeMemberUserIdSet = new Set(activeMemberUserIds);

  const allBeltLevels = await loadBeltLevelsForClub(clubId);
  const allBeltLevelById = new Map(
    allBeltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );
  const adultBeltLevels = allBeltLevels.filter((beltLevel) => !isJuniorBeltLevel(beltLevel));
  const adultBeltLevelById = new Map(
    adultBeltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );

  const latestAwardByUserId = await loadLatestGradeAwardsByUserId(
    activeMemberUserIds,
    clubId,
  );

  const studentProfilesByUserId = buildStudentProfilesByUserId(
    activeMemberUserIds,
    await loadAdminStudentProfileRowsByIds(activeMemberUserIds),
  );

  const rankedEntries = buildRankedStudentEntries({
    activeMemberUserIds: activeMemberUserIdSet,
    latestAwardByUserId,
    adultBeltLevelById,
    studentProfilesByUserId,
  });

  const beltGroups = buildAdultBeltRankingGroups(rankedEntries);

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
    studentProfilesByUserId: promotionStudentProfilesByUserId,
  });

  return {
    clubName,
    beltGroups,
    recentPromotions,
    lastUpdatedLabel: formatLastUpdatedLabel(),
  };
}
