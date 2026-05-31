import {
  countBjjAttendanceRecordsAfterAward,
  countUniqueBjjAttendanceDaysSince,
  type BjjAttendanceSummary,
} from "@/lib/admin-bjj-attendance.shared";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import {
  isJuniorBeltCategory,
  type BeltCategory,
} from "@/lib/admin-belt-levels.shared";
import { formatAdminBeltLabel } from "@/lib/admin-students";

export interface GradingProgressDiagnostics {
  userId: string;
  currentBeltAwardDate: string | null;
  rawAttendanceRecordsAfterAward: number;
  bjjAttendanceRecordsAfterAward: number;
  lifetimeBjjAttendanceCount: number;
  attendanceSinceCurrentLevel: number;
}

export function logGradingProgressDiagnostics(diagnostics: GradingProgressDiagnostics) {
  console.log("[grading-progress]", JSON.stringify(diagnostics));
}

export interface LatestGradeAwardInput {
  user_id: string;
  belt_level_id: string | null;
  awarded_at: string;
}

export interface BeltLevelProgressionRow {
  id: string;
  name: string;
  stripe_count: number | null;
  sort_order: number;
  type?: string | null;
  belt_category?: string | null;
}

export interface JuniorGradingRequirementRow {
  id: string;
  from_belt_level_id: string;
  to_belt_level_id: string;
  required_attendance: number;
  required_weeks: number;
  created_at?: string;
  updated_at?: string;
}

export type PromotionTimeUnit = "months" | "weeks";

export interface GradingRequirementRow {
  id: string;
  belt_level_id: string;
  minimum_months: number;
  minimum_attendances: number;
  instructor_approval_required: boolean;
  notes: string | null;
}

export interface BeltPromotionAssessment {
  isEligible: boolean;
  currentBeltLabel: string;
  nextBeltLabel: string;
  attendanceSinceAward: number;
  requiredAttendance: number;
  timeUnit: PromotionTimeUnit;
  timeSinceAward: number;
  requiredTime: number;
}

export function filterAdultBeltLevelsForPromotion<
  T extends BeltLevelProgressionRow,
>(beltLevels: T[]): T[] {
  return beltLevels.filter((belt) => !isJuniorBeltCategory(belt.belt_category));
}

export function filterJuniorBeltLevelsForPromotion<
  T extends BeltLevelProgressionRow,
>(beltLevels: T[]): T[] {
  return beltLevels.filter((belt) => isJuniorBeltCategory(belt.belt_category));
}

export function formatPromotionTimeSinceLabel(assessment: BeltPromotionAssessment) {
  const unit = assessment.timeUnit === "weeks" ? "week" : "month";
  const plural = assessment.timeSinceAward === 1 ? unit : `${unit}s`;

  return `${assessment.timeSinceAward} ${plural}`;
}

export function formatPromotionRequiredTimeLabel(assessment: BeltPromotionAssessment) {
  const unit = assessment.timeUnit === "weeks" ? "week" : "month";
  const plural = assessment.requiredTime === 1 ? unit : `${unit}s`;

  return `${assessment.requiredTime} ${plural}`;
}

export function formatPromotionTimeProgressLabel(assessment: BeltPromotionAssessment) {
  const unit = assessment.timeUnit === "weeks" ? "weeks" : "months";

  return `${assessment.timeSinceAward} / ${assessment.requiredTime} ${unit}`;
}

export function getNextBeltLevel(
  currentBeltLevelId: string | null,
  beltLevels: BeltLevelProgressionRow[],
): BeltLevelProgressionRow | null {
  if (beltLevels.length === 0) {
    return null;
  }

  const sorted = [...beltLevels].sort((left, right) => left.sort_order - right.sort_order);

  if (!currentBeltLevelId) {
    return sorted[0] ?? null;
  }

  const current = sorted.find((belt) => belt.id === currentBeltLevelId);

  if (!current) {
    return null;
  }

  return sorted.find((belt) => belt.sort_order > current.sort_order) ?? null;
}

export function weeksElapsedSinceAward(
  awardedAt: string,
  referenceDate = new Date(),
): number {
  const awardedOn = normalizeToDateKey(awardedAt);

  if (!awardedOn) {
    return 0;
  }

  const start = new Date(`${awardedOn}T12:00:00`);

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  const elapsedMs = referenceDate.getTime() - start.getTime();

  if (elapsedMs <= 0) {
    return 0;
  }

  return Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000));
}

export function monthsElapsedSinceAward(
  awardedAt: string,
  referenceDate = new Date(),
): number {
  const awardedOn = normalizeToDateKey(awardedAt);

  if (!awardedOn) {
    return 0;
  }

  const start = new Date(`${awardedOn}T12:00:00`);

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  const end = referenceDate;
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

export function isStudentEligibleForPromotion(
  assessment: BeltPromotionAssessment | null | undefined,
): boolean {
  return assessment?.isEligible === true;
}

/** Compare award timestamps by calendar date (YYYY-MM-DD). */
export function compareGradeAwardDates(
  leftAwardedAt: string,
  rightAwardedAt: string,
): number {
  const leftKey = normalizeToDateKey(leftAwardedAt);
  const rightKey = normalizeToDateKey(rightAwardedAt);

  if (!leftKey && !rightKey) {
    return 0;
  }

  if (!leftKey) {
    return -1;
  }

  if (!rightKey) {
    return 1;
  }

  return leftKey.localeCompare(rightKey);
}

/**
 * Latest grade award per student by awarded_at (not first row in a global sort).
 * Required when bulk-loading awards ordered club-wide — otherwise an older award
 * can be kept if it appears before the student's true latest in the result set.
 */
export function pickLatestGradeAwardByUserId(
  gradeAwards: LatestGradeAwardInput[],
): Map<string, LatestGradeAwardInput> {
  const latestByUserId = new Map<string, LatestGradeAwardInput>();

  for (const award of gradeAwards) {
    const existing = latestByUserId.get(award.user_id);

    if (
      !existing ||
      compareGradeAwardDates(award.awarded_at, existing.awarded_at) > 0
    ) {
      latestByUserId.set(award.user_id, award);
    }
  }

  return latestByUserId;
}

export function pickLatestGradeAwardForUser(
  userId: string,
  gradeAwards: LatestGradeAwardInput[],
): LatestGradeAwardInput | null {
  return pickLatestGradeAwardByUserId(gradeAwards).get(userId) ?? null;
}

function resolveCurrentBeltForPromotion(
  beltLevelId: string | null | undefined,
  beltLevels: BeltLevelProgressionRow[],
) {
  if (!beltLevelId) {
    return null;
  }

  return beltLevels.find((belt) => belt.id === beltLevelId) ?? null;
}

/** Same inputs as profile promotion card — use everywhere for considerPromotion. */
export function buildStudentBeltPromotionAssessment(input: {
  userId: string;
  latestAward: LatestGradeAwardInput | null | undefined;
  beltLevels: BeltLevelProgressionRow[];
  requirementsByTargetBeltId: Map<string, GradingRequirementRow>;
  juniorRequirementsByFromBeltId: Map<string, JuniorGradingRequirementRow>;
  bjjAttendance: BjjAttendanceSummary;
  logDiagnostics?: boolean;
}): BeltPromotionAssessment | null {
  const latestAward = input.latestAward;

  if (!latestAward?.belt_level_id || !latestAward.awarded_at) {
    return null;
  }

  const currentBelt = resolveCurrentBeltForPromotion(
    latestAward.belt_level_id,
    input.beltLevels,
  );

  if (!currentBelt) {
    return null;
  }

  const normalizedAward = {
    user_id: input.userId,
    belt_level_id: latestAward.belt_level_id,
    awarded_at: latestAward.awarded_at,
  };

  if (isJuniorBeltCategory(currentBelt.belt_category)) {
    return assessJuniorStudentBeltPromotion({
      latestAward: normalizedAward,
      beltLevels: filterJuniorBeltLevelsForPromotion(input.beltLevels),
      juniorRequirementsByFromBeltId: input.juniorRequirementsByFromBeltId,
      bjjAttendance: input.bjjAttendance,
      logDiagnostics: input.logDiagnostics,
    });
  }

  return assessStudentBeltPromotion({
    latestAward: normalizedAward,
    beltLevels: filterAdultBeltLevelsForPromotion(input.beltLevels),
    requirementsByTargetBeltId: input.requirementsByTargetBeltId,
    bjjAttendance: input.bjjAttendance,
    logDiagnostics: input.logDiagnostics,
  });
}

export function assessJuniorStudentBeltPromotion(input: {
  latestAward: LatestGradeAwardInput;
  beltLevels: BeltLevelProgressionRow[];
  juniorRequirementsByFromBeltId: Map<string, JuniorGradingRequirementRow>;
  bjjAttendance: BjjAttendanceSummary;
  logDiagnostics?: boolean;
}): BeltPromotionAssessment | null {
  const latestAward = input.latestAward;
  const currentBeltId = latestAward.belt_level_id;

  if (!currentBeltId || !latestAward.awarded_at) {
    return null;
  }

  const requirement =
    input.juniorRequirementsByFromBeltId.get(currentBeltId) ?? null;

  if (!requirement) {
    return null;
  }

  const beltLevelById = new Map(
    input.beltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );
  const currentBelt = beltLevelById.get(currentBeltId);
  const nextBelt = beltLevelById.get(requirement.to_belt_level_id);

  if (!currentBelt || !nextBelt) {
    return null;
  }

  const awardedAt = normalizeToDateKey(latestAward.awarded_at);

  if (!awardedAt) {
    return null;
  }

  const attendanceSinceCurrentLevel = countUniqueBjjAttendanceDaysSince(
    input.bjjAttendance.bjjRecords,
    awardedAt,
  );
  const weeksSinceCurrentLevel = weeksElapsedSinceAward(awardedAt);
  const isEligible =
    attendanceSinceCurrentLevel >= requirement.required_attendance &&
    weeksSinceCurrentLevel >= requirement.required_weeks;

  if (input.logDiagnostics) {
    logGradingProgressDiagnostics({
      userId: latestAward.user_id,
      currentBeltAwardDate: awardedAt,
      rawAttendanceRecordsAfterAward: 0,
      bjjAttendanceRecordsAfterAward: countBjjAttendanceRecordsAfterAward(
        input.bjjAttendance.bjjRecords,
        awardedAt,
      ),
      lifetimeBjjAttendanceCount: input.bjjAttendance.lifetimeBjjAttendanceCount,
      attendanceSinceCurrentLevel,
    });
  }

  return {
    isEligible,
    currentBeltLabel: formatAdminBeltLabel(currentBelt),
    nextBeltLabel: formatAdminBeltLabel(nextBelt),
    attendanceSinceAward: attendanceSinceCurrentLevel,
    requiredAttendance: requirement.required_attendance,
    timeUnit: "weeks",
    timeSinceAward: weeksSinceCurrentLevel,
    requiredTime: requirement.required_weeks,
  };
}

export function assessStudentBeltPromotion(input: {
  latestAward: LatestGradeAwardInput | null | undefined;
  beltLevels: BeltLevelProgressionRow[];
  requirementsByTargetBeltId: Map<string, GradingRequirementRow>;
  bjjAttendance: BjjAttendanceSummary;
  logDiagnostics?: boolean;
}): BeltPromotionAssessment | null {
  const latestAward = input.latestAward;

  if (!latestAward?.belt_level_id || !latestAward.awarded_at) {
    return null;
  }

  const beltLevelById = new Map(
    input.beltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );
  const currentBelt = beltLevelById.get(latestAward.belt_level_id);

  if (!currentBelt) {
    return null;
  }

  const nextBelt = getNextBeltLevel(latestAward.belt_level_id, input.beltLevels);

  if (!nextBelt) {
    return null;
  }

  const requirement = input.requirementsByTargetBeltId.get(nextBelt.id) ?? null;
  const awardedAt = normalizeToDateKey(latestAward.awarded_at);

  if (!awardedAt) {
    return null;
  }

  return computeGradingProgress({
    userId: latestAward.user_id,
    latestAward,
    beltLevels: input.beltLevels,
    requirementsByTargetBeltId: input.requirementsByTargetBeltId,
    bjjAttendance: input.bjjAttendance,
    logDiagnostics: input.logDiagnostics,
  });
}

/**
 * Grading progress: attendance since current level uses attendance_records only,
 * unique BJJ days on/after grade_awards.awarded_at (same rules as the attendance card).
 */
export function computeGradingProgress(input: {
  userId: string;
  latestAward: LatestGradeAwardInput | null | undefined;
  beltLevels: BeltLevelProgressionRow[];
  requirementsByTargetBeltId: Map<string, GradingRequirementRow>;
  bjjAttendance: BjjAttendanceSummary;
  logDiagnostics?: boolean;
}): BeltPromotionAssessment | null {
  const latestAward = input.latestAward;

  if (!latestAward?.belt_level_id || !latestAward.awarded_at) {
    return null;
  }

  const beltLevelById = new Map(
    input.beltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );
  const currentBelt = beltLevelById.get(latestAward.belt_level_id);

  if (!currentBelt) {
    return null;
  }

  const nextBelt = getNextBeltLevel(latestAward.belt_level_id, input.beltLevels);

  if (!nextBelt) {
    return null;
  }

  const requirement = input.requirementsByTargetBeltId.get(nextBelt.id) ?? null;
  const awardedAt = normalizeToDateKey(latestAward.awarded_at);

  if (!requirement || !awardedAt) {
    return null;
  }

  const attendanceSinceCurrentLevel = countUniqueBjjAttendanceDaysSince(
    input.bjjAttendance.bjjRecords,
    awardedAt,
  );
  const monthsSinceCurrentLevel = monthsElapsedSinceAward(awardedAt);
  const isEligible =
    attendanceSinceCurrentLevel >= requirement.minimum_attendances &&
    monthsSinceCurrentLevel >= requirement.minimum_months;

  if (input.logDiagnostics) {
    logGradingProgressDiagnostics({
      userId: input.userId,
      currentBeltAwardDate: awardedAt,
      rawAttendanceRecordsAfterAward: 0,
      bjjAttendanceRecordsAfterAward: countBjjAttendanceRecordsAfterAward(
        input.bjjAttendance.bjjRecords,
        awardedAt,
      ),
      lifetimeBjjAttendanceCount: input.bjjAttendance.lifetimeBjjAttendanceCount,
      attendanceSinceCurrentLevel,
    });
  }

  return {
    isEligible,
    currentBeltLabel: formatAdminBeltLabel(currentBelt),
    nextBeltLabel: formatAdminBeltLabel(nextBelt),
    attendanceSinceAward: attendanceSinceCurrentLevel,
    requiredAttendance: requirement.minimum_attendances,
    timeUnit: "months",
    timeSinceAward: monthsSinceCurrentLevel,
    requiredTime: requirement.minimum_months,
  };
}

export function assessBeltPromotion(input: {
  currentBelt: BeltLevelProgressionRow;
  nextBelt: BeltLevelProgressionRow;
  currentBeltLabel: string;
  nextBeltLabel: string;
  awardedAt: string | null;
  requirement: GradingRequirementRow | null;
  bjjAttendance: BjjAttendanceSummary;
}): BeltPromotionAssessment | null {
  const { requirement, awardedAt } = input;

  if (!requirement || !awardedAt) {
    return null;
  }

  const attendanceSinceAward = countUniqueBjjAttendanceDaysSince(
    input.bjjAttendance.bjjRecords,
    awardedAt,
  );
  const monthsSinceAward = monthsElapsedSinceAward(awardedAt);
  const isEligible =
    attendanceSinceAward >= requirement.minimum_attendances &&
    monthsSinceAward >= requirement.minimum_months;

  return {
    isEligible,
    currentBeltLabel: input.currentBeltLabel,
    nextBeltLabel: input.nextBeltLabel,
    attendanceSinceAward,
    requiredAttendance: requirement.minimum_attendances,
    timeUnit: "months",
    timeSinceAward: monthsSinceAward,
    requiredTime: requirement.minimum_months,
  };
}

export function formatPromotionProgressLabel(current: number, required: number) {
  return `${current} / ${required}`;
}

export interface PromotionCandidate {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  fullName: string;
  currentBeltCategory: BeltCategory;
  currentBeltSortOrder: number;
  assessment: BeltPromotionAssessment;
}

function getPromotionCandidateCategorySortRank(category: BeltCategory) {
  return category === "junior" ? 0 : 1;
}

export function resolvePromotionCandidateBeltCategory(
  beltCategory: string | null | undefined,
): BeltCategory {
  return isJuniorBeltCategory(beltCategory) ? "junior" : "adult";
}

export function filterPromotionCandidates(
  candidates: PromotionCandidate[],
  query?: string,
): PromotionCandidate[] {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return candidates;
  }

  return candidates.filter((candidate) => {
    const firstName = candidate.firstName?.toLowerCase() ?? "";
    const lastName = candidate.lastName?.toLowerCase() ?? "";
    const email = candidate.email?.toLowerCase() ?? "";
    const fullName = candidate.fullName.toLowerCase();

    return (
      firstName.includes(normalizedQuery) ||
      lastName.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      fullName.includes(normalizedQuery)
    );
  });
}

export function sortPromotionCandidates(
  candidates: PromotionCandidate[],
): PromotionCandidate[] {
  return [...candidates].sort((left, right) => {
    const categoryCompare =
      getPromotionCandidateCategorySortRank(left.currentBeltCategory) -
      getPromotionCandidateCategorySortRank(right.currentBeltCategory);

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    const beltCompare = left.currentBeltSortOrder - right.currentBeltSortOrder;

    if (beltCompare !== 0) {
      return beltCompare;
    }

    const lastNameCompare = (left.lastName ?? "").localeCompare(
      right.lastName ?? "",
      "en",
      { sensitivity: "base" },
    );

    if (lastNameCompare !== 0) {
      return lastNameCompare;
    }

    return (left.firstName ?? "").localeCompare(right.firstName ?? "", "en", {
      sensitivity: "base",
    });
  });
}
