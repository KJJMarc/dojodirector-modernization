import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { loadBjjAttendanceSummary } from "@/lib/admin-bjj-attendance.server";
import { normalizeToDateKey } from "@/lib/attendance-card-dates";
import {
  loadBeltLevelsForClub,
  loadGradingRequirementsByTargetBeltId,
  loadJuniorGradingRequirementsByFromBeltId,
} from "@/lib/admin-belt-promotion.server";
import {
  buildStudentBeltPromotionAssessment,
  pickLatestGradeAwardForUser,
} from "@/lib/admin-belt-promotion.shared";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import { formatInstructorRoleLabel } from "@/lib/admin-instructors.shared";
import {
  canChangeProfileMembershipRole,
  canDeleteStudentMembership,
} from "@/lib/admin-student-membership.shared";
import type { AdminStudentProfilePageData } from "@/lib/admin-student-profile.shared";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { getAdminStudentAgreementSummary } from "@/lib/student-portal-agreements.server";
import { membershipGrantsAdminDashboardPanel } from "@/lib/admin-auth.shared";
import {
  buildAdminDashboardAccessForProfile,
  createAdminDashboardAccessSummary,
  getAdminAccessSummaryForUser,
} from "@/lib/admin-auth.server";
import { isInstructorPortalMembershipRole } from "@/lib/instructor-portal-auth.shared";
import { getAdminInstructorPortalAuthSummary } from "@/lib/instructor-portal-auth.server";
import { getProfileLoginAccessSummary } from "@/lib/profile-login-access.server";
import { getAdminStudentPortalAuthSummary } from "@/lib/student-portal-auth.server";
import { loadUserAddressFromUsers } from "@/lib/user-address-field.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface UserProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  notes: string | null;
}

interface MembershipRow {
  role: string | null;
  status: string | null;
  notes: string | null;
}

interface GradeAwardRow {
  id: string;
  belt_level_id: string | null;
  awarded_at: string;
  notes: string | null;
}

interface BeltLevelRow {
  id: string;
  name: string;
  stripe_count: number | null;
  sort_order: number;
}

const USER_PROFILE_COLUMNS =
  "id, first_name, last_name, email, phone, date_of_birth, notes";

async function loadUserProfileRow(userId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select(USER_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load student profile: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  const addressLine = await loadUserAddressFromUsers(userId);

  return {
    user: data as UserProfileRow,
    address: addressLine || null,
  };
}

async function loadMembershipRow(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("role, status, notes")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  return data as MembershipRow;
}

async function loadGradeAwards(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select("id, belt_level_id, awarded_at, notes")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .order("awarded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load grade awards: ${error.message}`);
  }

  return (data ?? []) as GradeAwardRow[];
}

function combineNotes(
  userNotes: string | null,
  membershipNotes: string | null,
) {
  const parts = [userNotes?.trim(), membershipNotes?.trim()].filter(Boolean);

  return parts.length > 0 ? parts.join("\n\n") : null;
}

export async function getAdminStudentProfilePageData(
  userId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminStudentProfilePageData> {
  const [
    { user, address },
    membership,
    beltLevels,
    gradeAwards,
    requirementsByTargetBeltId,
    juniorRequirementsByFromBeltId,
    portalAccess,
    agreementAccess,
    loginAccess,
  ] = await Promise.all([
    loadUserProfileRow(userId),
    loadMembershipRow(userId, clubId),
    loadBeltLevelsForClub(clubId),
    loadGradeAwards(userId, clubId),
    loadGradingRequirementsByTargetBeltId(),
    loadJuniorGradingRequirementsByFromBeltId(clubId),
    getAdminStudentPortalAuthSummary(userId),
    getAdminStudentAgreementSummary(userId),
    getProfileLoginAccessSummary(userId),
  ]);

  const instructorPortalAccess = isInstructorPortalMembershipRole(membership.role)
    ? await getAdminInstructorPortalAuthSummary(userId)
    : null;
  const showAdminDashboardAccess = membershipGrantsAdminDashboardPanel(
    membership.role,
    membership.status,
  );
  const adminAccessSummary = await getAdminAccessSummaryForUser(userId);
  const adminAccess = showAdminDashboardAccess
    ? buildAdminDashboardAccessForProfile({
        profileEmail: user.email,
        membershipRole: membership.role,
        membershipStatus: membership.status,
        summary: adminAccessSummary,
      }) ??
      createAdminDashboardAccessSummary({
        profileEmail: user.email,
        membershipRole: membership.role,
        membershipStatus: membership.status,
        summary: adminAccessSummary,
      })
    : null;

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
      })),
    ) ?? null;
  const attendanceSummary = await loadBjjAttendanceSummary(
    userId,
    clubId,
    normalizeToDateKey(latestAward?.awarded_at ?? null),
  );

  const attendance = {
    lifetimeBjjCount: attendanceSummary.lifetimeBjjAttendanceCount,
    lastAttendanceDate: attendanceSummary.lastAttendanceDate,
  };
  const currentBelt = latestAward?.belt_level_id
    ? beltLevelById.get(latestAward.belt_level_id) ?? null
    : null;
  const promotion = buildStudentBeltPromotionAssessment({
    userId,
    latestAward,
    beltLevels,
    requirementsByTargetBeltId,
    juniorRequirementsByFromBeltId,
    bjjAttendance: attendanceSummary,
    logDiagnostics: true,
  });

  return {
    loginAccess,
    student: {
      id: user.id,
      fullName: getStudentFullName(user.first_name, user.last_name),
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.date_of_birth,
      address,
      notes: combineNotes(user.notes, membership.notes),
      role: formatInstructorRoleLabel(membership.role),
      membershipRole: membership.role,
      membershipStatus: membership.status,
      canChangeRole: canChangeProfileMembershipRole(membership.role),
      canDelete: canDeleteStudentMembership(membership.role),
    },
    portalAccess: {
      portalStatusLabel: portalAccess.portalAuthStatusLabel,
      portalLoginEmail: portalAccess.portalLoginEmail,
      inviteSentAt: portalAccess.portalInvitedAt,
      canSetPassword: portalAccess.canSetPassword,
    },
    instructorPortalAccess: instructorPortalAccess
      ? {
          portalStatusLabel: instructorPortalAccess.portalAuthStatusLabel,
          portalLoginEmail: instructorPortalAccess.portalLoginEmail,
          inviteSentAt: instructorPortalAccess.portalInvitedAt,
          canSendInvite: instructorPortalAccess.canSendInvite,
          canSetPassword: instructorPortalAccess.canSetPassword,
        }
      : null,
    showAdminDashboardAccess,
    adminAccess,
    agreementAccess,
    attendance,
    belt: {
      currentBeltLabel: formatAdminBeltLabel(currentBelt),
      currentBeltAwardedAt: latestAward?.awarded_at ?? null,
      nextBeltLabel: promotion?.nextBeltLabel ?? null,
      promotion,
    },
    gradeHistory: gradeAwards.map((award) => ({
      id: award.id,
      beltLabel: formatAdminBeltLabel(
        award.belt_level_id
          ? beltLevelById.get(award.belt_level_id) ?? null
          : null,
      ),
      awardedAt: award.awarded_at,
      notes: award.notes,
    })),
  };
}

export type { AdminStudentProfilePageData };
