import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import {
  buildBjjAttendanceSummary,
  type BjjAttendanceSummary,
} from "@/lib/admin-bjj-attendance.shared";
import {
  loadBjjAttendanceSummariesByUserId,
  loadBjjAttendanceSummary,
} from "@/lib/admin-bjj-attendance.server";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import {
  buildStudentBeltPromotionAssessment,
  getNextBeltLevel,
  isStudentEligibleForPromotion,
  pickLatestGradeAwardByUserId,
  resolvePromotionCandidateBeltCategory,
  sortPromotionCandidates,
  type BeltLevelProgressionRow,
  type BeltPromotionAssessment,
  type GradingRequirementRow,
  type JuniorGradingRequirementRow,
  type LatestGradeAwardInput,
  type PromotionCandidate,
} from "@/lib/admin-belt-promotion.shared";
import {
  loadAdminStudentProfileRowsByIds,
  loadClubMembershipRows,
} from "@/lib/admin-club-memberships.server";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { loadMembershipStatusesByUserId } from "@/lib/membership-access.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** KJJ test/dev — promotion candidate debug focus user. */
const CLARE_BARTON_FOCUS_USER_ID = "b3092955-e688-43c0-bb0c-adbfae7e7b62";

type LatestGradeAwardRow = LatestGradeAwardInput;

export { assessStudentBeltPromotion } from "@/lib/admin-belt-promotion.shared";

/** Service-role Supabase client for admin promotion calculations (never browser/anon). */
function getPromotionAdminSupabaseClient() {
  return getSupabaseAdminClient();
}

function isSupabasePermissionDenied(error: { message?: string } | null) {
  return error?.message?.toLowerCase().includes("permission denied") ?? false;
}

function getJuniorBaseOrderFromSortOrder(sortOrder: number) {
  return Math.floor((sortOrder - 1000) / 5);
}

function buildJuniorGradingRequirementsFromBeltLevels(
  juniorBelts: BeltLevelProgressionRow[],
) {
  const sorted = [...juniorBelts].sort(
    (left, right) => left.sort_order - right.sort_order,
  );
  const requirements = new Map<string, JuniorGradingRequirementRow>();

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const fromBelt = sorted[index];
    const toBelt = sorted[index + 1];
    const baseOrder = getJuniorBaseOrderFromSortOrder(fromBelt.sort_order);
    const required_attendance = baseOrder < 3 ? 4 : 8;
    const required_weeks = baseOrder < 3 ? 5 : 10;

    requirements.set(fromBelt.id, {
      id: `${fromBelt.id}:${toBelt.id}`,
      from_belt_level_id: fromBelt.id,
      to_belt_level_id: toBelt.id,
      required_attendance,
      required_weeks,
    });
  }

  return requirements;
}

async function loadJuniorBeltLevelsForClubFromAdmin(
  clubId: string,
  supabase: ReturnType<typeof getPromotionAdminSupabaseClient>,
) {
  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order, type, belt_category")
    .eq("club_id", clubId)
    .eq("belt_category", "junior")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load junior belt levels: ${error.message}`);
  }

  return (data ?? []) as BeltLevelProgressionRow[];
}

export async function loadBeltLevelsForClub(
  clubId: string,
): Promise<BeltLevelProgressionRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order, type, belt_category, colour")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load belt levels: ${error.message}`);
  }

  return (data ?? []) as BeltLevelProgressionRow[];
}

const SUPABASE_IN_BATCH_SIZE = 100;

function chunkIds<T>(ids: T[], batchSize = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < ids.length; index += batchSize) {
    chunks.push(ids.slice(index, index + batchSize));
  }

  return chunks;
}

export async function loadGradingRequirementsByTargetBeltId() {
  const supabase = getPromotionAdminSupabaseClient();
  const allRequirements: GradingRequirementRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("grading_requirements")
      .select(
        "id, belt_level_id, minimum_months, minimum_attendances, instructor_approval_required, notes",
      )
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to load grading requirements: ${error.message}`);
    }

    const page = (data ?? []) as GradingRequirementRow[];
    allRequirements.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return new Map(
    allRequirements.map((requirement) => [requirement.belt_level_id, requirement]),
  );
}

function buildJuniorRequirementsMapFromTargetModel(
  juniorBelts: BeltLevelProgressionRow[],
  targetRequirements: {
    id: string;
    belt_level_id: string;
    minimum_attendances: number | null;
    required_attendance?: number | null;
    required_weeks: number;
  }[],
) {
  const sorted = [...juniorBelts].sort(
    (left, right) => left.sort_order - right.sort_order,
  );
  const beltById = new Map(sorted.map((belt) => [belt.id, belt]));
  const requirements = new Map<string, JuniorGradingRequirementRow>();

  for (const requirement of targetRequirements) {
    const toBelt = beltById.get(requirement.belt_level_id);

    if (!toBelt) {
      continue;
    }

    const toIndex = sorted.findIndex((belt) => belt.id === toBelt.id);
    const fromBelt = toIndex > 0 ? sorted[toIndex - 1] : null;

    if (!fromBelt) {
      continue;
    }

    requirements.set(fromBelt.id, {
      id: requirement.id,
      from_belt_level_id: fromBelt.id,
      to_belt_level_id: toBelt.id,
      required_attendance:
        requirement.required_attendance ?? requirement.minimum_attendances ?? 0,
      required_weeks: requirement.required_weeks,
    });
  }

  return requirements;
}

async function loadJuniorGradingRequirementsFromTargetModel(clubId: string) {
  const supabase = getPromotionAdminSupabaseClient();
  const juniorBelts = await loadJuniorBeltLevelsForClubFromAdmin(clubId, supabase);
  const beltIds = new Set(juniorBelts.map((belt) => belt.id));
  const targetRequirements: {
    id: string;
    belt_level_id: string;
    minimum_attendances: number | null;
    required_weeks: number;
  }[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("junior_grading_requirements")
      .select("id, belt_level_id, minimum_attendances, required_weeks")
      .range(from, from + pageSize - 1);

    if (error) {
      return buildJuniorGradingRequirementsFromBeltLevels(juniorBelts);
    }

    const page = (data ?? []) as {
      id: string;
      belt_level_id: string;
      minimum_attendances: number | null;
      required_weeks: number;
    }[];

    for (const requirement of page) {
      if (beltIds.has(requirement.belt_level_id)) {
        targetRequirements.push(requirement);
      }
    }

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  if (targetRequirements.length === 0) {
    return buildJuniorGradingRequirementsFromBeltLevels(juniorBelts);
  }

  return buildJuniorRequirementsMapFromTargetModel(juniorBelts, targetRequirements);
}

export async function loadJuniorGradingRequirementsByFromBeltId(clubId: string) {
  const supabase = getPromotionAdminSupabaseClient();
  const allRequirements: JuniorGradingRequirementRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("junior_grading_requirements")
      .select(
        "id, from_belt_level_id, to_belt_level_id, required_attendance, required_weeks, created_at, updated_at",
      )
      .range(from, from + pageSize - 1);

    if (error) {
      if (isSupabasePermissionDenied(error)) {
        const juniorBelts = await loadJuniorBeltLevelsForClubFromAdmin(
          clubId,
          supabase,
        );

        return buildJuniorGradingRequirementsFromBeltLevels(juniorBelts);
      }

      return loadJuniorGradingRequirementsFromTargetModel(clubId);
    }

    const page = (data ?? []) as JuniorGradingRequirementRow[];
    allRequirements.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  if (allRequirements.length === 0) {
    return loadJuniorGradingRequirementsFromTargetModel(clubId);
  }

  return new Map(
    allRequirements.map((requirement) => [
      requirement.from_belt_level_id,
      requirement,
    ]),
  );
}

function buildCurrentLevelAwardedAtByUserId(
  latestAwardByUserId: Map<string, LatestGradeAwardRow>,
) {
  const awardedAtByUserId = new Map<string, string | null>();

  for (const [userId, award] of Array.from(latestAwardByUserId)) {
    awardedAtByUserId.set(userId, normalizeToDateKey(award.awarded_at));
  }

  return awardedAtByUserId;
}

export async function loadPromotionFlagsByUserId(
  userIds: string[],
  clubId: string,
  latestAwardByUserId: Map<string, LatestGradeAwardRow>,
  bjjAttendanceByUserId?: Map<string, BjjAttendanceSummary>,
  evaluationData?: {
    beltLevels: BeltLevelProgressionRow[];
    requirementsByTargetBeltId: Map<string, GradingRequirementRow>;
    juniorRequirementsByFromBeltId: Map<string, JuniorGradingRequirementRow>;
  },
): Promise<Map<string, boolean>> {
  const flags = new Map<string, boolean>();

  if (userIds.length === 0) {
    return flags;
  }

  const awardedAtByUserId = buildCurrentLevelAwardedAtByUserId(latestAwardByUserId);

  const [beltLevels, requirementsByTargetBeltId, juniorRequirementsByFromBeltId, summaries, membershipStatuses] =
    await Promise.all([
      evaluationData?.beltLevels
        ? Promise.resolve(evaluationData.beltLevels)
        : loadBeltLevelsForClub(clubId),
      evaluationData?.requirementsByTargetBeltId
        ? Promise.resolve(evaluationData.requirementsByTargetBeltId)
        : loadGradingRequirementsByTargetBeltId(),
      evaluationData?.juniorRequirementsByFromBeltId
        ? Promise.resolve(evaluationData.juniorRequirementsByFromBeltId)
        : loadJuniorGradingRequirementsByFromBeltId(clubId),
      bjjAttendanceByUserId
        ? Promise.resolve(bjjAttendanceByUserId)
        : loadBjjAttendanceSummariesByUserId(userIds, clubId, awardedAtByUserId),
      loadMembershipStatusesByUserId(userIds, clubId),
    ]);

  for (const userId of userIds) {
    if (!isActiveMembershipStatus(membershipStatuses.get(userId))) {
      flags.set(userId, false);
      continue;
    }

    const assessment = buildStudentBeltPromotionAssessment({
      userId,
      latestAward: latestAwardByUserId.get(userId),
      beltLevels,
      requirementsByTargetBeltId,
      juniorRequirementsByFromBeltId,
      bjjAttendance:
        summaries.get(userId) ??
        buildBjjAttendanceSummary([], awardedAtByUserId.get(userId) ?? null),
    });

    flags.set(userId, isStudentEligibleForPromotion(assessment));
  }

  return flags;
}


interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface PromotionEvaluationContext {
  userIds: string[];
  membershipRoleByUserId: Map<string, string | null>;
  membershipStatusByUserId: Map<string, string | null>;
  userById: Map<string, UserRow>;
  latestAwardByUserId: Map<string, LatestGradeAwardRow>;
  beltLevels: BeltLevelProgressionRow[];
  requirementsByTargetBeltId: Map<string, GradingRequirementRow>;
  juniorRequirementsByFromBeltId: Map<string, JuniorGradingRequirementRow>;
  bjjAttendanceByUserId: Map<string, BjjAttendanceSummary>;
  awardedAtByUserId: Map<string, string | null>;
  beltLevelById: Map<string, BeltLevelProgressionRow>;
}

export async function loadLatestGradeAwardsByUserId(
  userIds: string[],
  clubId: string,
): Promise<Map<string, LatestGradeAwardRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const allAwards: LatestGradeAwardRow[] = [];
  const pageSize = 1000;

  for (const userIdBatch of chunkIds(userIds)) {
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("grade_awards")
        .select("user_id, belt_level_id, awarded_at")
        .in("user_id", userIdBatch)
        .eq("club_id", clubId)
        .order("awarded_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Failed to load grade awards: ${error.message}`);
      }

      const page = (data ?? []) as LatestGradeAwardRow[];
      allAwards.push(...page);

      if (page.length < pageSize) {
        break;
      }

      from += pageSize;
    }
  }

  return pickLatestGradeAwardByUserId(allAwards);
}

async function loadUsersByIds(userIds: string[]) {
  return loadAdminStudentProfileRowsByIds(userIds);
}

function isBillyBloggsFocusUser(user: UserRow | undefined): boolean {
  if (!user) {
    return false;
  }

  const fullName = getStudentFullName(user.first_name, user.last_name).toLowerCase();
  const email = user.email?.toLowerCase() ?? "";

  return (
    fullName.includes("billy bloggs") ||
    (user.last_name?.toLowerCase() === "bloggs" &&
      user.first_name?.toLowerCase() === "billy")
  );
}

async function loadUserRowById(userId: string): Promise<UserRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user ${userId}: ${error.message}`);
  }

  return (data as UserRow | null) ?? null;
}

async function resolveBillyBloggsUserId(
  context: PromotionEvaluationContext,
): Promise<string | null> {
  for (const userId of context.userIds) {
    const user = context.userById.get(userId);

    if (user && isBillyBloggsFocusUser(user)) {
      return userId;
    }
  }

  for (const userId of context.userIds) {
    const user = await loadUserRowById(userId);

    if (user && isBillyBloggsFocusUser(user)) {
      return userId;
    }
  }

  return null;
}

function resolvePromotionCandidateSkipBranch(input: {
  isEligible: boolean;
}): string {
  if (!input.isEligible) {
    return "SKIP:assessment.isEligible_not_true";
  }

  return "INCLUDE:assessment.isEligible_true";
}

function logClareBartonPromotionDebug(input: {
  clubId: string;
  loadedInPromotionScope: boolean;
  membershipRole: string | null;
  userId: string;
  user: UserRow | null;
  assessment: BeltPromotionAssessment | null;
  profileAttendance: BjjAttendanceSummary | null;
  skipBranch: string;
  inCandidates: boolean;
  exclusionReason: string | null;
}) {
  const payload = {
    focus: "CLARE_BARTON_PROMOTION",
    clubId: input.clubId,
    userId: input.userId,
    name: input.user
      ? getStudentFullName(input.user.first_name, input.user.last_name)
      : null,
    email: input.user?.email ?? null,
    membershipRole: input.membershipRole,
    loadedInPromotionScope: input.loadedInPromotionScope,
    currentBelt: input.assessment?.currentBeltLabel ?? null,
    nextBelt: input.assessment?.nextBeltLabel ?? null,
    attendanceSinceCurrentLevel: input.assessment?.attendanceSinceAward ?? null,
    requiredAttendance: input.assessment?.requiredAttendance ?? null,
    timeSinceCurrentLevel: input.assessment?.timeSinceAward ?? null,
    requiredTime: input.assessment?.requiredTime ?? null,
    timeUnit: input.assessment?.timeUnit ?? null,
    eligible: input.assessment?.isEligible === true,
    considerPromotion: isStudentEligibleForPromotion(input.assessment),
    skipBranch: input.skipBranch,
    inCandidates: input.inCandidates,
    exclusionReason: input.exclusionReason,
    profileLifetimeBjjCount: input.profileAttendance?.lifetimeBjjAttendanceCount ?? null,
    profileAttendanceSinceLevel:
      input.profileAttendance?.attendanceSinceCurrentLevel ?? null,
  };

  console.log("[promotion-candidates][CLARE_BARTON]", JSON.stringify(payload));
}

async function logBillyBloggsAssertionDebug(input: {
  clubId: string;
  context: PromotionEvaluationContext;
  billyUserId: string | null;
  assessment: BeltPromotionAssessment | null;
  profileAttendance: BjjAttendanceSummary | null;
  skipBranch: string;
  inCandidates: boolean;
}) {
  const loadedInStudentsList = input.billyUserId
    ? input.context.userIds.includes(input.billyUserId)
    : false;
  const user = input.billyUserId
    ? input.context.userById.get(input.billyUserId) ??
      (await loadUserRowById(input.billyUserId))
    : null;
  const latestAward = input.billyUserId
    ? input.context.latestAwardByUserId.get(input.billyUserId)
    : undefined;
  const currentBelt = latestAward?.belt_level_id
    ? input.context.beltLevelById.get(latestAward.belt_level_id)
    : null;
  const nextBelt = latestAward?.belt_level_id
    ? getNextBeltLevel(latestAward.belt_level_id, input.context.beltLevels)
    : null;
  const gradingRequirement = nextBelt
    ? input.context.requirementsByTargetBeltId.get(nextBelt.id) ?? null
    : null;

  const payload = {
    assertion: "BILLY_BLOGGS_PROMOTION_CANDIDATES",
    clubId: input.clubId,
    loadedInStudentsList,
    billyUserId: input.billyUserId,
    billyName: user ? getStudentFullName(user.first_name, user.last_name) : null,
    billyEmail: user?.email ?? null,
    inUserByIdMap: input.billyUserId
      ? input.context.userById.has(input.billyUserId)
      : false,
    currentGradeAward: latestAward ?? null,
    currentBelt: currentBelt
      ? {
          id: currentBelt.id,
          name: currentBelt.name,
          stripe_count: currentBelt.stripe_count,
          sort_order: currentBelt.sort_order,
        }
      : null,
    nextBelt: nextBelt
      ? {
          id: nextBelt.id,
          name: nextBelt.name,
          stripe_count: nextBelt.stripe_count,
          sort_order: nextBelt.sort_order,
        }
      : null,
    gradingRequirement,
    profileAlignedAttendanceSummary: input.profileAttendance,
    assessmentIsEligible: input.assessment?.isEligible ?? null,
    assessmentConsiderPromotion: isStudentEligibleForPromotion(input.assessment),
    skipBranch: input.skipBranch,
    inCandidatesResult: input.inCandidates,
  };

  console.log("[promotion-candidates][BILLY_BLOGGS_ASSERT]", JSON.stringify(payload));
}

async function buildProfileAlignedPromotionAssessment(
  userId: string,
  clubId: string,
  context: PromotionEvaluationContext,
  logDiagnostics = false,
): Promise<{
  assessment: BeltPromotionAssessment | null;
  profileAttendance: BjjAttendanceSummary;
}> {
  const latestAward = context.latestAwardByUserId.get(userId);
  const awardedAt = context.awardedAtByUserId.get(userId) ?? null;
  const profileAttendance = await loadBjjAttendanceSummary(userId, clubId, awardedAt);
  const assessment = buildStudentBeltPromotionAssessment({
    userId,
    latestAward,
    beltLevels: context.beltLevels,
    requirementsByTargetBeltId: context.requirementsByTargetBeltId,
    juniorRequirementsByFromBeltId: context.juniorRequirementsByFromBeltId,
    bjjAttendance: profileAttendance,
    logDiagnostics,
  });

  return { assessment, profileAttendance };
}

function logPromotionCandidateDiagnostics(input: {
  clubId: string;
  totalStudents: number;
  entries: Array<Record<string, unknown>>;
  includedCount: number;
}) {
  console.log(
    "[promotion-candidates]",
    JSON.stringify({
      clubId: input.clubId,
      totalStudents: input.totalStudents,
      includedCount: input.includedCount,
      students: input.entries,
    }),
  );
}

/** Shared data + rules used by students list flags, profile, and promotion candidates. */
async function loadPromotionEvaluationContext(
  clubId: string,
): Promise<PromotionEvaluationContext> {
  const membershipRows = await loadClubMembershipRows(clubId);

  // Same membership scope as admin Students list (all roles/statuses) so red-star
  // flags and Promotion Candidates stay aligned — e.g. admin/instructor members who train.
  const userIds = Array.from(
    new Set(membershipRows.map((row) => row.user_id)),
  );

  if (userIds.length === 0) {
    return {
      userIds: [],
      membershipRoleByUserId: new Map(),
      membershipStatusByUserId: new Map(),
      userById: new Map(),
      latestAwardByUserId: new Map(),
      beltLevels: [],
      requirementsByTargetBeltId: new Map(),
      juniorRequirementsByFromBeltId: new Map(),
      bjjAttendanceByUserId: new Map(),
      awardedAtByUserId: new Map(),
      beltLevelById: new Map(),
    };
  }

  // Promotion eligibility uses active membership status only; paused/inactive are excluded.
  const membershipRoleByUserId = new Map(
    membershipRows.map((row) => [row.user_id, row.role]),
  );
  const membershipStatusByUserId = new Map(
    membershipRows.map((row) => [row.user_id, row.status]),
  );

  const [userById, latestAwardByUserId] = await Promise.all([
    loadUsersByIds(userIds),
    loadLatestGradeAwardsByUserId(userIds, clubId),
  ]);
  const awardedAtByUserId = buildCurrentLevelAwardedAtByUserId(latestAwardByUserId);

  const [beltLevels, requirementsByTargetBeltId, juniorRequirementsByFromBeltId, bjjAttendanceByUserId] =
    await Promise.all([
      loadBeltLevelsForClub(clubId),
      loadGradingRequirementsByTargetBeltId(),
      loadJuniorGradingRequirementsByFromBeltId(clubId),
      loadBjjAttendanceSummariesByUserId(userIds, clubId, awardedAtByUserId),
    ]);

  const beltLevelById = new Map(
    beltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );

  return {
    userIds,
    membershipRoleByUserId,
    membershipStatusByUserId,
    userById,
    latestAwardByUserId,
    beltLevels,
    requirementsByTargetBeltId,
    juniorRequirementsByFromBeltId,
    bjjAttendanceByUserId,
    awardedAtByUserId,
    beltLevelById,
  };
}

export async function loadPromotionCandidates(
  clubId: string,
): Promise<PromotionCandidate[]> {
  const context = await loadPromotionEvaluationContext(clubId);
  const billyBloggsUserId = await resolveBillyBloggsUserId(context);

  if (context.userIds.length === 0) {
    logPromotionCandidateDiagnostics({
      clubId,
      totalStudents: 0,
      entries: [],
      includedCount: 0,
    });
    await logBillyBloggsAssertionDebug({
      clubId,
      context,
      billyUserId: billyBloggsUserId,
      assessment: null,
      profileAttendance: null,
      skipBranch: "SKIP:empty_club_membership_list",
      inCandidates: false,
    });
    return [];
  }

  const candidates: PromotionCandidate[] = [];
  const diagnosticEntries: Array<Record<string, unknown>> = [];
  let billyLoopAssessment: BeltPromotionAssessment | null = null;
  let billyLoopAttendance: BjjAttendanceSummary | null = null;
  let billySkipBranch = "SKIP:not_processed_in_loop";
  let clareLoopAssessment: BeltPromotionAssessment | null = null;
  let clareLoopAttendance: BjjAttendanceSummary | null = null;
  let clareSkipBranch = "SKIP:not_processed_in_loop";
  let clareInCandidates = false;

  for (const userId of context.userIds) {
    if (!isActiveMembershipStatus(context.membershipStatusByUserId.get(userId))) {
      continue;
    }

    const isBilly = billyBloggsUserId !== null && userId === billyBloggsUserId;
    const isClare = userId === CLARE_BARTON_FOCUS_USER_ID;
    let user = context.userById.get(userId);
    const latestAward = context.latestAwardByUserId.get(userId);
    const bulkAttendance = context.bjjAttendanceByUserId.get(userId);
    const { assessment, profileAttendance } =
      await buildProfileAlignedPromotionAssessment(
        userId,
        clubId,
        context,
        isBilly || isClare,
      );
    const isEligible = assessment?.isEligible === true;
    const considerPromotion = isStudentEligibleForPromotion(assessment);
    const skipBranch = resolvePromotionCandidateSkipBranch({ isEligible });

    if (isBilly) {
      billyLoopAssessment = assessment;
      billyLoopAttendance = profileAttendance;
      billySkipBranch = skipBranch;
    }

    if (isClare) {
      clareLoopAssessment = assessment;
      clareLoopAttendance = profileAttendance;
      clareSkipBranch = skipBranch;
    }

    const entry: Record<string, unknown> = {
      userId,
      name: user
        ? getStudentFullName(user.first_name, user.last_name)
        : "(missing user row)",
      email: user?.email ?? null,
      currentBelt: assessment?.currentBeltLabel ?? null,
      nextBelt: assessment?.nextBeltLabel ?? null,
      attendanceSinceCurrentLevel: assessment?.attendanceSinceAward ?? null,
      requiredAttendance: assessment?.requiredAttendance ?? null,
      timeSinceCurrentLevel: assessment?.timeSinceAward ?? null,
      requiredTime: assessment?.requiredTime ?? null,
      timeUnit: assessment?.timeUnit ?? null,
      considerPromotion,
      assessmentIsEligible: assessment?.isEligible ?? null,
      skipBranch,
      bulkLifetimeBjjCount: bulkAttendance?.lifetimeBjjAttendanceCount ?? null,
      profileAlignedLifetimeBjjCount: profileAttendance.lifetimeBjjAttendanceCount,
      bulkVsProfileLifetimeDelta:
        profileAttendance.lifetimeBjjAttendanceCount -
        (bulkAttendance?.lifetimeBjjAttendanceCount ?? 0),
    };

    diagnosticEntries.push(entry);

    if (!isEligible || !assessment) {
      continue;
    }

    if (!user) {
      const reloadedUser = await loadUserRowById(userId);

      if (!reloadedUser) {
        if (isBilly) {
          billySkipBranch = "SKIP:missing_user_row_after_reload";
        }

        if (isClare) {
          clareSkipBranch = "SKIP:missing_user_row_after_reload";
        }

        continue;
      }

      user = reloadedUser;
    }

    const currentBelt = latestAward?.belt_level_id
      ? context.beltLevelById.get(latestAward.belt_level_id)
      : null;

    candidates.push({
      id: userId,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      fullName: getStudentFullName(user.first_name, user.last_name),
      currentBeltCategory: resolvePromotionCandidateBeltCategory(
        currentBelt?.belt_category,
      ),
      currentBeltSortOrder: currentBelt?.sort_order ?? Number.MAX_SAFE_INTEGER,
      assessment,
    });

    if (isClare) {
      clareInCandidates = true;
    }
  }
  if (billyBloggsUserId) {
    const billyInCandidates = candidates.some(
      (candidate) => candidate.id === billyBloggsUserId,
    );

    await logBillyBloggsAssertionDebug({
      clubId,
      context,
      billyUserId: billyBloggsUserId,
      assessment: billyLoopAssessment,
      profileAttendance: billyLoopAttendance,
      skipBranch: billySkipBranch,
      inCandidates: billyInCandidates,
    });

    if (!billyInCandidates && billyLoopAssessment?.isEligible === true) {
      const user =
        context.userById.get(billyBloggsUserId) ??
        (await loadUserRowById(billyBloggsUserId));

      if (user) {
        console.log(
          "[promotion-candidates][BILLY_BLOGGS_ASSERT]",
          JSON.stringify({
            action: "FORCE_INCLUDE_PROFILE_ELIGIBLE",
            reason: "eligible_in_loop_but_missing_from_candidates_array",
            priorSkipBranch: billySkipBranch,
          }),
        );

        const latestAward = context.latestAwardByUserId.get(billyBloggsUserId);
        const currentBelt = latestAward?.belt_level_id
          ? context.beltLevelById.get(latestAward.belt_level_id)
          : null;

        candidates.push({
          id: billyBloggsUserId,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          fullName: getStudentFullName(user.first_name, user.last_name),
          currentBeltCategory: resolvePromotionCandidateBeltCategory(
            currentBelt?.belt_category,
          ),
          currentBeltSortOrder: currentBelt?.sort_order ?? Number.MAX_SAFE_INTEGER,
          assessment: billyLoopAssessment,
        });
      }
    }
  }

  const clareLoadedInScope = context.userIds.includes(CLARE_BARTON_FOCUS_USER_ID);
  let clareExclusionReason: string | null = null;

  if (!clareLoadedInScope) {
    clareExclusionReason = "SKIP:not_in_promotion_scope_user_ids";
    clareSkipBranch = clareExclusionReason;
  } else if (!clareInCandidates) {
    if (!clareLoopAssessment) {
      clareExclusionReason = "SKIP:no_assessment";
    } else if (clareLoopAssessment.isEligible !== true) {
      clareExclusionReason = "SKIP:assessment.isEligible_not_true";
    } else {
      clareExclusionReason = "SKIP:eligible_but_not_in_candidates_array";
    }
  }

  const clareUser =
    context.userById.get(CLARE_BARTON_FOCUS_USER_ID) ??
    (await loadUserRowById(CLARE_BARTON_FOCUS_USER_ID));

  logClareBartonPromotionDebug({
    clubId,
    loadedInPromotionScope: clareLoadedInScope,
    membershipRole:
      context.membershipRoleByUserId.get(CLARE_BARTON_FOCUS_USER_ID) ?? null,
    userId: CLARE_BARTON_FOCUS_USER_ID,
    user: clareUser,
    assessment: clareLoopAssessment,
    profileAttendance: clareLoopAttendance,
    skipBranch: clareSkipBranch,
    inCandidates: clareInCandidates,
    exclusionReason: clareExclusionReason,
  });

  logPromotionCandidateDiagnostics({
    clubId,
    totalStudents: context.userIds.length,
    entries: diagnosticEntries,
    includedCount: candidates.length,
  });

  return sortPromotionCandidates(candidates);
}
