import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import {
  loadBjjAttendanceSummary,
  loadBjjAttendanceRecordsForYear,
} from "@/lib/admin-bjj-attendance.server";
import {
  buildYearlyGrid,
  formatBeltLabel,
  type AttendanceCardHeaderStats,
  type StudentAttendanceCardData,
} from "@/lib/attendance-card";
import {
  buildAttendanceCardGradingDiagnostics,
  filterGradeAwardsForAttendanceCardYear,
  logAttendanceCardGradingDiagnostics,
  type GradeAwardGradingMarkerInput,
} from "@/lib/attendance-card-grading.shared";
import { getStudentClubContextForAttendance } from "@/lib/attendance-card-manual.server";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BeltLevel, UserProfile } from "@/types/database";

interface GradeAwardRow extends GradeAwardGradingMarkerInput {
  id: string;
  user_id: string;
  awarded_at: string;
  belt_level_id: string | null;
}

const GRADE_AWARDS_PAGE_SIZE = 1000;

async function getStudentProfile(userId: string): Promise<UserProfile> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load student: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  return data as UserProfile;
}

async function getAttendanceRecordsForYear(
  userId: string,
  year: number,
  clubId: string,
) {
  return loadBjjAttendanceRecordsForYear(userId, clubId, year);
}

async function getAllGradeAwards(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const allAwards: GradeAwardRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("grade_awards")
      .select(
        "id, user_id, awarded_at, belt_level_id, belt_levels(name, type)",
      )
      .eq("user_id", userId)
      .eq("club_id", clubId)
      .order("awarded_at", { ascending: false })
      .range(from, from + GRADE_AWARDS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load grade awards: ${error.message}`);
    }

    const page = (data ?? []) as GradeAwardRow[];
    allAwards.push(...page);

    if (page.length < GRADE_AWARDS_PAGE_SIZE) {
      break;
    }

    from += GRADE_AWARDS_PAGE_SIZE;
  }

  return allAwards;
}

async function getBeltLevelById(
  beltLevelId: string | null,
): Promise<BeltLevel | null> {
  if (!beltLevelId) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, colour, stripe_count")
    .eq("id", beltLevelId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load belt level: ${error.message}`);
  }

  return (data as BeltLevel | null) ?? null;
}

function getLatestAwardOnOrBeforeYearEnd(
  awards: GradeAwardRow[],
  year: number,
): GradeAwardRow | null {
  const endDate = `${year}-12-31`;

  for (const award of awards) {
    const awardedOn = normalizeToDateKey(award.awarded_at);

    if (awardedOn && awardedOn <= endDate) {
      return { ...award, awarded_at: awardedOn };
    }
  }

  return null;
}

async function loadAttendanceCardHeaderStats(
  userId: string,
  clubId: string,
): Promise<AttendanceCardHeaderStats> {
  const bjjAttendance = await loadBjjAttendanceSummary(userId, clubId, null);

  return {
    lifetimeBjjAttendanceCount: bjjAttendance.lifetimeBjjAttendanceCount,
    lastAttendanceDate: bjjAttendance.lastAttendanceDate,
  };
}

export async function getStudentAttendanceCardData(
  userId: string,
  year: number,
  clubId?: string,
): Promise<StudentAttendanceCardData> {
  const resolvedClubId =
    clubId ?? (await getStudentClubContextForAttendance(userId)).clubId;

  const [student, attendances, allGradeAwards] = await Promise.all([
    getStudentProfile(userId),
    getAttendanceRecordsForYear(userId, year, resolvedClubId),
    getAllGradeAwards(userId, resolvedClubId),
  ]);

  const gradeAwards = filterGradeAwardsForAttendanceCardYear(
    allGradeAwards,
    year,
  );

  logAttendanceCardGradingDiagnostics(
    buildAttendanceCardGradingDiagnostics({
      userId,
      year,
      clubId: resolvedClubId,
      allGradeAwards,
      gradeAwardsInYear: gradeAwards,
    }),
  );

  const beltAwardAtYearEnd = getLatestAwardOnOrBeforeYearEnd(
    allGradeAwards,
    year,
  );
  const beltLevel = beltAwardAtYearEnd
    ? await getBeltLevelById(beltAwardAtYearEnd.belt_level_id)
    : null;

  const { rows, totalAttendance } = buildYearlyGrid(
    attendances,
    gradeAwards,
    year,
  );

  const headerStats = await loadAttendanceCardHeaderStats(userId, resolvedClubId);

  return {
    student,
    studentName: getStudentFullName(student.first_name, student.last_name),
    beltLabel: formatBeltLabel(beltLevel),
    year,
    rows,
    totalAttendance,
    headerStats,
  };
}
