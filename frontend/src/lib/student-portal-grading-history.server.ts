import "server-only";

import { loadBeltLevelsForClub } from "@/lib/admin-belt-promotion.server";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import { formatProfileDate } from "@/lib/admin-student-profile.shared";
import { getStudentFullName } from "@/lib/attendance";
import { getAdminStudentProfilePageData } from "@/lib/admin-student-profile.server";
import type { StudentPortalGradingHistoryPageData } from "@/lib/student-portal.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface GradeAwardRow {
  id: string;
  belt_level_id: string | null;
  awarded_at: string;
  awarded_by_user_id: string | null;
}

function compareGradeAwardDates(left: string, right: string) {
  return left.localeCompare(right);
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

async function loadGradeAwards(userId: string, clubId: string): Promise<GradeAwardRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select("id, belt_level_id, awarded_at, awarded_by_user_id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .order("awarded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load grade awards: ${error.message}`);
  }

  return (data ?? []) as GradeAwardRow[];
}

async function loadAwardedByNames(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return new Map<string, string>();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .in("id", uniqueUserIds);

  if (error) {
    throw new Error(`Failed to load award instructors: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as { id: string; first_name: string | null; last_name: string | null }[]).map(
      (row) => [row.id, getStudentFullName(row.first_name, row.last_name)],
    ),
  );
}

export async function getStudentPortalGradingHistoryPageData(
  userId: string,
  clubId: string,
): Promise<StudentPortalGradingHistoryPageData> {
  const [profile, beltLevels, gradeAwards] = await Promise.all([
    getAdminStudentProfilePageData(userId, clubId),
    loadBeltLevelsForClub(clubId),
    loadGradeAwards(userId, clubId),
  ]);

  const beltLevelById = new Map(beltLevels.map((beltLevel) => [beltLevel.id, beltLevel]));
  const awardedByNameByUserId = await loadAwardedByNames(
    gradeAwards.map((award) => award.awarded_by_user_id).filter(Boolean) as string[],
  );

  const sortedAwards = sortGradeAwardsNewestFirst(gradeAwards);

  return {
    studentName: profile.student.fullName,
    entries: sortedAwards.map((award) => {
      const previousAward = findPreviousGradeAward(gradeAwards, award);

      return {
        id: award.id,
        dateLabel: formatProfileDate(award.awarded_at),
        previousRankLabel: previousAward?.belt_level_id
          ? formatAdminBeltLabel(beltLevelById.get(previousAward.belt_level_id) ?? null)
          : "—",
        newRankLabel: award.belt_level_id
          ? formatAdminBeltLabel(beltLevelById.get(award.belt_level_id) ?? null)
          : "Not set",
        awardedByLabel: award.awarded_by_user_id
          ? (awardedByNameByUserId.get(award.awarded_by_user_id) ?? null)
          : null,
      };
    }),
  };
}
