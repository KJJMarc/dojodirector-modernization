import "server-only";

import {
  buildRecentPromotionEntries,
  type BeltLevelProgressionRow,
} from "@/lib/admin-belt-promotion.shared";
import {
  loadBeltLevelsForClub,
  loadLatestGradeAwardsByUserIdForClubs,
} from "@/lib/admin-belt-promotion.server";
import { resolveJuniorBeltRankingsSourceClubIds } from "@/lib/belt-rankings-clubs.shared";
import {
  loadAdminStudentProfileRowsByIds,
  loadClubMembershipRows,
} from "@/lib/admin-club-memberships.server";
import { isJuniorBeltLevel } from "@/lib/admin-belt-levels.shared";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import {
  compareJuniorBeltRankingGroups,
  compareJuniorBeltStripeGroups,
  formatLastUpdatedLabel,
  formatPromotionDateLabel,
  getJuniorBeltRepresentativeColour,
  getJuniorBeltRepresentativeName,
  getJuniorBeltSectionKey,
  getJuniorBeltSectionLabel,
  getJuniorBeltSectionSortKey,
  shouldIncludeJuniorRankedStudent,
  JUNIOR_BELT_RANKINGS_RECENT_PROMOTION_DAYS,
  JUNIOR_BELT_SECTIONS,
  parseJuniorBeltRankParts,
  sortStudentsBySurnameFirstName,
  shouldIncludeJuniorRecentPromotionInPublicCongratulations,
  type JuniorBeltRankingGroup,
  type JuniorBeltRankingStripeGroup,
  type JuniorBeltRankingStudent,
  type JuniorBeltRankingsPageData,
  type JuniorBeltRecentPromotion,
} from "@/lib/junior-belt-rankings.shared";
import { getBeltStripeCount } from "@/lib/adult-belt-rankings.shared";
import { getStudentFullName } from "@/lib/attendance";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface GradeAwardRow {
  id: string;
  user_id: string;
  belt_level_id: string | null;
  awarded_at: string;
  created_at: string | null;
  updated_at: string | null;
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

async function loadActiveMemberUserIdsForClubs(clubIds: readonly string[]) {
  const userIds = new Set<string>();

  for (const clubId of clubIds) {
    const memberships = await loadClubMembershipRows(clubId);

    for (const membership of memberships) {
      if (isActiveMembershipStatus(membership.status)) {
        userIds.add(membership.user_id);
      }
    }
  }

  return Array.from(userIds);
}

function buildCanonicalJuniorBeltByLabel(
  beltLevelsByClub: BeltLevelProgressionRow[][],
) {
  const canonicalByLabel = new Map<string, BeltLevelProgressionRow>();

  for (const beltLevels of beltLevelsByClub) {
    for (const beltLevel of beltLevels) {
      if (!isJuniorBeltLevel(beltLevel)) {
        continue;
      }

      const label = formatAdminBeltLabel(beltLevel);

      if (!canonicalByLabel.has(label)) {
        canonicalByLabel.set(label, beltLevel);
      }
    }
  }

  return canonicalByLabel;
}

function resolveCanonicalJuniorBelt(
  beltLevel: BeltLevelProgressionRow,
  canonicalJuniorBeltByLabel: Map<string, BeltLevelProgressionRow>,
) {
  return (
    canonicalJuniorBeltByLabel.get(formatAdminBeltLabel(beltLevel)) ?? beltLevel
  );
}

function getRecentPromotionCutoffDate(referenceDate = new Date()) {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - JUNIOR_BELT_RANKINGS_RECENT_PROMOTION_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
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
  clubIds: readonly string[],
): Promise<GradeAwardRow[]> {
  if (userIds.length === 0 || clubIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const allAwards: GradeAwardRow[] = [];

  for (const userIdBatch of chunkIds(userIds)) {
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("grade_awards")
        .select("id, user_id, belt_level_id, awarded_at, created_at, updated_at")
        .in("club_id", clubIds)
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
  clubIds: readonly string[],
  cutoffDate: Date,
): Promise<GradeAwardRow[]> {
  if (clubIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const awards: GradeAwardRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("grade_awards")
      .select("id, user_id, belt_level_id, awarded_at, created_at, updated_at")
      .in("club_id", clubIds)
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

interface RankedJuniorStudentEntry {
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  currentRankLabel: string;
  beltLevel: BeltLevelProgressionRow;
  sectionKey: string;
}

function buildRankedJuniorStudentEntries(input: {
  activeMemberUserIds: Set<string>;
  latestAwardByUserId: Map<
    string,
    { belt_level_id: string | null; awarded_at: string }
  >;
  juniorBeltLevelById: Map<string, BeltLevelProgressionRow>;
  canonicalJuniorBeltByLabel: Map<string, BeltLevelProgressionRow>;
  studentProfilesByUserId: Map<
    string,
    Pick<JuniorBeltRankingStudent, "fullName" | "firstName" | "lastName">
  >;
}): RankedJuniorStudentEntry[] {
  const entries: RankedJuniorStudentEntry[] = [];

  for (const userId of Array.from(input.activeMemberUserIds)) {
    const latestAward = input.latestAwardByUserId.get(userId);
    const beltLevelId = latestAward?.belt_level_id;

    if (!isJuniorBeltLevelId(beltLevelId, input.juniorBeltLevelById)) {
      continue;
    }

    const rawBeltLevel = input.juniorBeltLevelById.get(beltLevelId!)!;
    const beltLevel = resolveCanonicalJuniorBelt(
      rawBeltLevel,
      input.canonicalJuniorBeltByLabel,
    );
    const rankParts = parseJuniorBeltRankParts(
      beltLevel.name,
      beltLevel.stripe_count,
      beltLevel.colour ?? null,
    );
    const sectionKey = getJuniorBeltSectionKey(rankParts);
    const stripeCount = getBeltStripeCount(beltLevel);

    if (!shouldIncludeJuniorRankedStudent(sectionKey, stripeCount)) {
      continue;
    }

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

    entries.push({
      userId,
      fullName: profile.fullName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      currentRankLabel: formatAdminBeltLabel(beltLevel),
      beltLevel,
      sectionKey,
    });
  }

  return entries;
}

function buildJuniorBeltStripeGroups(
  entries: RankedJuniorStudentEntry[],
): JuniorBeltRankingStripeGroup[] {
  const groupsByRankLabel = new Map<
    string,
    { beltLevel: BeltLevelProgressionRow; students: JuniorBeltRankingStudent[] }
  >();

  for (const entry of entries) {
    const groupKey = formatAdminBeltLabel(entry.beltLevel);
    const existing = groupsByRankLabel.get(groupKey);
    const student: JuniorBeltRankingStudent = {
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

    groupsByRankLabel.set(groupKey, {
      beltLevel: entry.beltLevel,
      students: [student],
    });
  }

  return Array.from(groupsByRankLabel.values())
    .map(({ beltLevel, students }) => ({
      beltLevelId: beltLevel.id,
      rankLabel: formatAdminBeltLabel(beltLevel),
      stripeCount: getBeltStripeCount(beltLevel),
      beltSortOrder: beltLevel.sort_order,
      students: sortStudentsBySurnameFirstName(students),
    }))
    .sort(compareJuniorBeltStripeGroups);
}

function buildJuniorBeltRankingGroups(
  entries: RankedJuniorStudentEntry[],
): JuniorBeltRankingGroup[] {
  const entriesBySectionKey = new Map<string, RankedJuniorStudentEntry[]>();

  for (const entry of entries) {
    const sectionEntries = entriesBySectionKey.get(entry.sectionKey) ?? [];
    sectionEntries.push(entry);
    entriesBySectionKey.set(entry.sectionKey, sectionEntries);
  }

  const groups: JuniorBeltRankingGroup[] = [];

  for (const section of JUNIOR_BELT_SECTIONS) {
    const sectionKey = getJuniorBeltSectionKey(section);
    const sectionEntries = entriesBySectionKey.get(sectionKey) ?? [];

    if (sectionEntries.length === 0) {
      continue;
    }

    const stripeGroups = buildJuniorBeltStripeGroups(sectionEntries);

    if (stripeGroups.length === 0) {
      continue;
    }

    groups.push({
      sectionKey,
      sectionLabel: getJuniorBeltSectionLabel(section),
      beltName: getJuniorBeltRepresentativeName(section),
      beltColour: getJuniorBeltRepresentativeColour(section),
      rankSortKey: getJuniorBeltSectionSortKey(section),
      totalStudents: sectionEntries.length,
      stripeGroups,
    });
  }

  return groups.sort(compareJuniorBeltRankingGroups);
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
  awardsByUserId: Map<string, GradeAwardRow[]>;
  activeMemberUserIds: Set<string>;
  cutoffDate: Date;
  allBeltLevelById: Map<string, BeltLevelProgressionRow>;
  juniorBeltLevelById: Map<string, BeltLevelProgressionRow>;
  studentProfilesByUserId: Map<
    string,
    Pick<JuniorBeltRankingStudent, "fullName">
  >;
}): JuniorBeltRecentPromotion[] {
  return buildRecentPromotionEntries({
    activeMemberUserIds: input.activeMemberUserIds,
    awardsByUserId: input.awardsByUserId,
    cutoffDate: input.cutoffDate,
    getStudentName: (userId) =>
      input.studentProfilesByUserId.get(userId)?.fullName ?? "Unknown student",
    formatNewRankLabel: (beltLevelId) =>
      formatAdminBeltLabel(
        beltLevelId ? input.allBeltLevelById.get(beltLevelId) ?? null : null,
      ),
    formatPreviousRankLabel: (beltLevelId) =>
      formatAdminBeltLabel(
        beltLevelId ? input.allBeltLevelById.get(beltLevelId) ?? null : null,
      ),
    formatPromotionDateLabel,
    shouldIncludeAward: (award) => {
      if (!isJuniorBeltLevelId(award.belt_level_id, input.juniorBeltLevelById)) {
        return false;
      }

      const promotedBelt = award.belt_level_id
        ? input.allBeltLevelById.get(award.belt_level_id) ?? null
        : null;

      return shouldIncludeJuniorRecentPromotionInPublicCongratulations(
        promotedBelt,
      );
    },
  });
}

export async function getJuniorBeltRankingsPageData(
  clubId: string,
  clubName: string,
  clubSlug: string,
): Promise<JuniorBeltRankingsPageData> {
  const sourceClubIds = resolveJuniorBeltRankingsSourceClubIds(clubSlug, clubId);
  const activeMemberUserIds = await loadActiveMemberUserIdsForClubs(sourceClubIds);
  const activeMemberUserIdSet = new Set(activeMemberUserIds);

  const beltLevelsByClub = await Promise.all(
    sourceClubIds.map((sourceClubId) => loadBeltLevelsForClub(sourceClubId)),
  );
  const allBeltLevels = beltLevelsByClub.flat();
  const allBeltLevelById = new Map(
    allBeltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );
  const juniorBeltLevels = allBeltLevels.filter(
    (beltLevel) => isJuniorBeltLevel(beltLevel) && beltLevel.is_active !== false,
  );
  const juniorBeltLevelById = new Map(
    juniorBeltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );
  const beltLevelsOrderedForCanonical = sourceClubIds
    .map((sourceClubId, index) => ({
      sourceClubId,
      beltLevels: beltLevelsByClub[index] ?? [],
    }))
    .sort((left, right) => {
      if (left.sourceClubId === clubId) {
        return -1;
      }

      if (right.sourceClubId === clubId) {
        return 1;
      }

      return 0;
    })
    .map((entry) => entry.beltLevels);
  const canonicalJuniorBeltByLabel = buildCanonicalJuniorBeltByLabel(
    beltLevelsOrderedForCanonical,
  );

  const latestAwardByUserId = await loadLatestGradeAwardsByUserIdForClubs(
    activeMemberUserIds,
    sourceClubIds,
  );

  const studentProfilesByUserId = buildStudentProfilesByUserId(
    activeMemberUserIds,
    await loadAdminStudentProfileRowsByIds(activeMemberUserIds),
  );

  const rankedEntries = buildRankedJuniorStudentEntries({
    activeMemberUserIds: activeMemberUserIdSet,
    latestAwardByUserId,
    juniorBeltLevelById,
    canonicalJuniorBeltByLabel,
    studentProfilesByUserId,
  });

  const beltGroups = buildJuniorBeltRankingGroups(rankedEntries);

  const cutoffDate = getRecentPromotionCutoffDate();
  const recentAwards = await loadRecentGradeAwards(sourceClubIds, cutoffDate);
  const recentPromotionUserIds = Array.from(
    new Set(recentAwards.map((award) => award.user_id)),
  );
  const promotionHistoryAwards = await loadGradeAwardsForUsers(
    recentPromotionUserIds,
    sourceClubIds,
  );
  const promotionStudentProfilesByUserId = buildStudentProfilesByUserId(
    recentPromotionUserIds,
    await loadAdminStudentProfileRowsByIds(recentPromotionUserIds),
  );

  const recentPromotions = buildRecentPromotions({
    awardsByUserId: groupGradeAwardsByUserId(promotionHistoryAwards),
    activeMemberUserIds: activeMemberUserIdSet,
    cutoffDate,
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
