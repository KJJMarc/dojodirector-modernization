import "server-only";

import { getAdminBeltLevelOptionsForClub } from "@/lib/admin-change-belt.server";
import {
  pickLatestGradeAwardForUser,
  sortGradeAwardsNewestFirst,
} from "@/lib/admin-belt-promotion.shared";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import {
  formatGradeAwardNotesForDisplay,
  type AdminStudentProfileGradeHistoryEntry,
} from "@/lib/admin-student-profile.shared";
import type { AdminStudentGradingHistoryPageData } from "@/lib/admin-student-grading-history.shared";
import { getStudentFullName } from "@/lib/attendance";
import { loadBeltLevelsForClub } from "@/lib/admin-belt-promotion.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface GradeAwardRow {
  id: string;
  belt_level_id: string | null;
  awarded_at: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

async function assertClubMember(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }
}

async function loadUser(userId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load student: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  return data as UserRow;
}

async function loadGradeAwards(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select("id, belt_level_id, awarded_at, notes, created_at, updated_at")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .order("awarded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load grade awards: ${error.message}`);
  }

  return (data ?? []) as GradeAwardRow[];
}

export async function getAdminStudentGradingHistoryPageData(
  userId: string,
  clubId: string,
): Promise<AdminStudentGradingHistoryPageData> {
  await assertClubMember(userId, clubId);

  const [user, beltLevels, gradeAwards, gradingBeltOptions] = await Promise.all([
    loadUser(userId),
    loadBeltLevelsForClub(clubId),
    loadGradeAwards(userId, clubId),
    getAdminBeltLevelOptionsForClub(clubId),
  ]);

  const beltLevelById = new Map(
    beltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );

  const latestAward =
    pickLatestGradeAwardForUser(
      userId,
      gradeAwards.map((award) => ({
        user_id: userId,
        belt_level_id: award.belt_level_id,
        awarded_at: award.awarded_at,
        id: award.id,
        created_at: award.created_at,
        updated_at: award.updated_at,
      })),
    ) ?? null;

  const currentBelt = latestAward?.belt_level_id
    ? beltLevelById.get(latestAward.belt_level_id) ?? null
    : null;

  const gradeHistory: AdminStudentProfileGradeHistoryEntry[] =
    sortGradeAwardsNewestFirst(gradeAwards).map((award) => ({
      id: award.id,
      beltLevelId: award.belt_level_id,
      beltLabel: formatAdminBeltLabel(
        award.belt_level_id
          ? beltLevelById.get(award.belt_level_id) ?? null
          : null,
      ),
      awardedAt: award.awarded_at,
      notes: formatGradeAwardNotesForDisplay(award.notes),
    }));

  return {
    userId,
    studentName: getStudentFullName(user.first_name, user.last_name),
    currentBeltLabel: formatAdminBeltLabel(currentBelt),
    currentBeltAwardedAt: latestAward?.awarded_at ?? null,
    gradeHistory,
    gradingBeltOptions: {
      adult: gradingBeltOptions.adultBeltOptions,
      junior: gradingBeltOptions.juniorBeltOptions,
    },
  };
}
