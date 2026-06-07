import "server-only";

import { loadLatestGradeAwardsByUserId } from "@/lib/admin-belt-promotion.server";
import { loadBjjAttendanceSummariesByUserId } from "@/lib/admin-bjj-attendance.server";
import type { BjjAttendanceSummary } from "@/lib/admin-bjj-attendance.shared";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
  formatAdminBeltLabel,
  matchesAdminStudentListStatusFilter,
  resolveAdminStudentLeadSource,
  type AdminStudent,
  type AdminStudentListStatusFilter,
} from "@/lib/admin-students";
import {
  loadAdminStudentProfileRowsByIds,
  loadClubMembershipRows,
  type AdminStudentProfileRow,
  type ClubMembershipRow,
} from "@/lib/admin-club-memberships.server";
import type { AdminProgramme } from "@/lib/admin-programmes.shared";
import {
  requireClubBjjProgramme,
  resolveProgrammeStudentAreaAdminListUserIds,
} from "@/lib/admin-programmes.server";
import { isStudentMembershipRole } from "@/lib/admin-student-membership.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface GradeAwardRow {
  user_id: string;
  belt_level_id: string | null;
  awarded_at: string;
}

interface BeltLevelRow {
  id: string;
  name: string;
  stripe_count: number | null;
  sort_order: number;
}

async function getBeltLevelsById(beltLevelIds: string[]) {
  if (beltLevelIds.length === 0) {
    return new Map<string, BeltLevelRow>();
  }

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order")
    .in("id", beltLevelIds);

  if (error) {
    throw new Error(`Failed to load belt levels: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as BeltLevelRow[]).map((beltLevel) => [beltLevel.id, beltLevel]),
  );
}

function buildCurrentLevelAwardedAtByUserId(
  latestGradeAwardByUserId: Map<string, GradeAwardRow>,
) {
  const awardedAtByUserId = new Map<string, string | null>();

  for (const [userId, award] of Array.from(latestGradeAwardByUserId)) {
    awardedAtByUserId.set(userId, normalizeToDateKey(award.awarded_at));
  }

  return awardedAtByUserId;
}

interface ScopedClubStudentRows {
  scopedMembershipRows: ClubMembershipRow[];
  userById: Map<string, AdminStudentProfileRow>;
}

async function loadScopedClubStudentRows(
  clubId: string,
  programme?: Pick<AdminProgramme, "id" | "slug" | "programmeType">,
  statusFilter: AdminStudentListStatusFilter = DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
): Promise<ScopedClubStudentRows | null> {
  const membershipRows = await loadClubMembershipRows(clubId);
  let programmeUserIds: Set<string> | null = null;

  if (programme) {
    const userIds = await resolveProgrammeStudentAreaAdminListUserIds(
      clubId,
      programme,
    );

    if (userIds.length === 0) {
      return null;
    }

    programmeUserIds = new Set(userIds);
  }

  const scopedMembershipRows = membershipRows.filter((membership) => {
    if (programmeUserIds && !programmeUserIds.has(membership.user_id)) {
      return false;
    }

    // Club-wide lists stay student-only; programme lists include instructors/admins with programme access.
    if (!programme && !isStudentMembershipRole(membership.role)) {
      return false;
    }

    return matchesAdminStudentListStatusFilter(membership.status, statusFilter);
  });

  if (scopedMembershipRows.length === 0) {
    return null;
  }

  const userIds = Array.from(
    new Set(scopedMembershipRows.map((membership) => membership.user_id)),
  );

  const userById = await loadAdminStudentProfileRowsByIds(userIds);

  return { scopedMembershipRows, userById };
}

/** Same row scope as getClubStudents — matches the admin Students list total. */
export async function countClubStudents(
  clubId: string = ACTIVE_CLUB_ID,
  programme?: Pick<AdminProgramme, "id" | "slug" | "programmeType">,
  statusFilter: AdminStudentListStatusFilter = DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
): Promise<number> {
  const scopedRows = await loadScopedClubStudentRows(
    clubId,
    programme,
    statusFilter,
  );

  if (!scopedRows) {
    return 0;
  }

  let count = 0;

  for (const membership of scopedRows.scopedMembershipRows) {
    if (scopedRows.userById.has(membership.user_id)) {
      count += 1;
    }
  }

  return count;
}

export async function getClubStudents(
  clubId: string = ACTIVE_CLUB_ID,
  programme?: Pick<
    AdminProgramme,
    "id" | "slug" | "programmeType" | "beltsRanksEnabled" | "promotionCandidatesEnabled"
  >,
  statusFilter: AdminStudentListStatusFilter = DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
): Promise<AdminStudent[]> {
  const scopedRows = await loadScopedClubStudentRows(
    clubId,
    programme,
    statusFilter,
  );

  if (!scopedRows) {
    return [];
  }

  const { scopedMembershipRows, userById } = scopedRows;
  const userIds = Array.from(
    new Set(scopedMembershipRows.map((membership) => membership.user_id)),
  );
  const useBjjEnrichment = programme?.beltsRanksEnabled !== false;

  let latestGradeAwardByUserId = new Map<string, GradeAwardRow>();
  let bjjAttendanceByUserId = new Map<string, BjjAttendanceSummary>();
  let beltLevelById = new Map<string, BeltLevelRow>();

  if (useBjjEnrichment) {
    latestGradeAwardByUserId = await loadLatestGradeAwardsByUserId(
      userIds,
      clubId,
    );
    const awardedAtByUserId = buildCurrentLevelAwardedAtByUserId(
      latestGradeAwardByUserId,
    );

    bjjAttendanceByUserId = await loadBjjAttendanceSummariesByUserId(
      userIds,
      clubId,
      awardedAtByUserId,
    );

    const beltLevelIds = Array.from(
      new Set(
        Array.from(latestGradeAwardByUserId.values())
          .map((award) => award.belt_level_id)
          .filter((beltLevelId): beltLevelId is string => Boolean(beltLevelId)),
      ),
    );

    beltLevelById = await getBeltLevelsById(beltLevelIds);
  }

  const students: AdminStudent[] = [];

  for (const membership of scopedMembershipRows) {
    const user = userById.get(membership.user_id);

    if (!user) {
      continue;
    }

    const latestAward = latestGradeAwardByUserId.get(user.id);
    const beltLevel = latestAward?.belt_level_id
      ? beltLevelById.get(latestAward.belt_level_id)
      : null;
    const bjjAttendance = bjjAttendanceByUserId.get(user.id);

    const leadSource = resolveAdminStudentLeadSource(user.original_lead_source);

    students.push({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: membership.role,
      membershipStatus: membership.status,
      originalLeadSource: leadSource.originalLeadSource,
      originalLeadSourceLabel: leadSource.originalLeadSourceLabel,
      beltLabel: useBjjEnrichment ? formatAdminBeltLabel(beltLevel) : "—",
      beltSortOrder: useBjjEnrichment ? (beltLevel?.sort_order ?? null) : null,
      attendanceTotal: bjjAttendance?.lifetimeBjjAttendanceCount ?? 0,
      // Promotion eligibility is computed only on the Promotion Candidates page.
      considerPromotion: false,
    });
  }

  return students;
}

export async function getBjjProgrammeStudents(
  clubId: string = ACTIVE_CLUB_ID,
  statusFilter: AdminStudentListStatusFilter = DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
): Promise<AdminStudent[]> {
  const bjjProgramme = await requireClubBjjProgramme(clubId);
  return getClubStudents(clubId, bjjProgramme, statusFilter);
}

export async function countBjjProgrammeStudents(
  clubId: string = ACTIVE_CLUB_ID,
  statusFilter: AdminStudentListStatusFilter = DEFAULT_ADMIN_STUDENT_STATUS_FILTER,
): Promise<number> {
  const bjjProgramme = await requireClubBjjProgramme(clubId);
  return countClubStudents(clubId, bjjProgramme, statusFilter);
}
