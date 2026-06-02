import { normalizeToDateKey } from "@/lib/attendance-card-dates";

/** Minimal grade_awards row needed to paint G markers on the attendance card. */
export interface GradeAwardGradingMarkerInput {
  awarded_at: string;
  belt_level_id?: string | null;
  belt_levels?: {
    name?: string | null;
    type?: string | null;
  } | null;
}

export interface GradeAwardForYear extends GradeAwardGradingMarkerInput {
  awarded_at: string;
}

export interface AttendanceCardGradingDiagnostics {
  userId: string;
  year: number;
  clubId: string;
  totalGradeAwardsLoaded: number;
  gradeAwardsInYear: number;
  gradingMarkerDates: string[];
  blackBeltDegreeAwardsInYear: Array<{
    awarded_at: string;
    belt_name: string | null;
    belt_type: string | null;
  }>;
}

/** Calendar year for an award date — no belt type/category filtering. */
export function isGradeAwardInYear(awardedAt: string, year: number): boolean {
  const dateKey = normalizeToDateKey(awardedAt);
  if (!dateKey) {
    return false;
  }

  return dateKey.startsWith(`${year}-`);
}

/**
 * Grade awards that should produce G markers for the selected year.
 * Includes coloured belts, stripes, black belt, and black belt degrees.
 */
export function filterGradeAwardsForAttendanceCardYear<
  T extends GradeAwardGradingMarkerInput,
>(awards: T[], year: number): Array<T & { awarded_at: string }> {
  const normalized: Array<T & { awarded_at: string }> = [];

  for (const award of awards) {
    const dateKey = normalizeToDateKey(award.awarded_at);
    if (!dateKey || !isGradeAwardInYear(dateKey, year)) {
      continue;
    }

    normalized.push({ ...award, awarded_at: dateKey });
  }

  return normalized;
}

/** Unique YYYY-MM-DD dates for G markers derived from grade_awards.awarded_at only. */
export function collectGradingMarkerDates(
  gradeAwards: Array<{ awarded_at: string }>,
): string[] {
  const dates = new Set<string>();

  for (const award of gradeAwards) {
    const dateKey = normalizeToDateKey(award.awarded_at);
    if (dateKey) {
      dates.add(dateKey);
    }
  }

  return Array.from(dates).sort();
}

export function buildAttendanceCardGradingDiagnostics(input: {
  userId: string;
  year: number;
  clubId: string;
  allGradeAwards: GradeAwardGradingMarkerInput[];
  gradeAwardsInYear: GradeAwardForYear[];
}): AttendanceCardGradingDiagnostics {
  const gradingMarkerDates = collectGradingMarkerDates(input.gradeAwardsInYear);

  const blackBeltDegreeAwardsInYear = input.gradeAwardsInYear
    .filter((award) => {
      const name = award.belt_levels?.name?.toLowerCase() ?? "";
      const type = award.belt_levels?.type?.toLowerCase() ?? "";
      return type === "degree" || /black belt.*degree/i.test(name);
    })
    .map((award) => ({
      awarded_at: award.awarded_at,
      belt_name: award.belt_levels?.name ?? null,
      belt_type: award.belt_levels?.type ?? null,
    }));

  return {
    userId: input.userId,
    year: input.year,
    clubId: input.clubId,
    totalGradeAwardsLoaded: input.allGradeAwards.length,
    gradeAwardsInYear: input.gradeAwardsInYear.length,
    gradingMarkerDates,
    blackBeltDegreeAwardsInYear,
  };
}

export function logAttendanceCardGradingDiagnostics(
  diagnostics: AttendanceCardGradingDiagnostics,
) {
  if (process.env.ATTENDANCE_CARD_LOG_GRADING !== "1") {
    return;
  }

  console.log("[attendance-card-grading]", JSON.stringify(diagnostics));
}
