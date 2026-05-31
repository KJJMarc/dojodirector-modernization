import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { loadBjjAttendanceSummary } from "@/lib/admin-bjj-attendance.server";
import {
  buildYearlyGrid,
  formatBeltLabel,
  type AttendanceCardHeaderStats,
  type StudentAttendanceCardData,
} from "@/lib/attendance-card";
import {
  ATTENDANCE_RECORDS_BJJ_SELECT,
  isBjjAttendanceRecordWithJoinedSession,
  type BjjAttendanceRecordRow,
} from "@/lib/admin-bjj-attendance.shared";
import { getStudentClubContextForAttendance } from "@/lib/attendance-card-manual.server";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { AttendanceRecord, BeltLevel, UserProfile } from "@/types/database";

interface GradeAwardRow {
  id: string;
  user_id: string;
  awarded_at: string;
  belt_level_id: string | null;
}

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
  const supabase = getSupabaseAdminClient();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from("attendance_records")
    .select(`id, user_id, ${ATTENDANCE_RECORDS_BJJ_SELECT}`)
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .gte("attended_on", startDate)
    .lte("attended_on", endDate);

  if (error) {
    throw new Error(`Failed to load attendance records: ${error.message}`);
  }

  return ((data ?? []) as Array<AttendanceRecord & BjjAttendanceRecordRow>)
    .filter((record) => isBjjAttendanceRecordWithJoinedSession(record))
    .map(({ id, user_id, attended_on }) => ({ id, user_id, attended_on }));
}

async function getAllGradeAwards(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select("id, user_id, awarded_at, belt_level_id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .order("awarded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load grade awards: ${error.message}`);
  }

  return (data ?? []) as GradeAwardRow[];
}

function getGradeAwardsForYear(awards: GradeAwardRow[], year: number) {
  return awards
    .map((award) => {
      const awardedOn = normalizeToDateKey(award.awarded_at);

      if (!awardedOn) {
        return null;
      }

      return { ...award, awarded_at: awardedOn };
    })
    .filter(
      (award): award is GradeAwardRow =>
        Boolean(award && award.awarded_at.startsWith(`${year}-`)),
    );
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

  const gradeAwards = getGradeAwardsForYear(allGradeAwards, year);
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
