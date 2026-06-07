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
import { formatAdminBeltLabel, resolveAdminStudentLeadSource } from "@/lib/admin-students";
import { formatInstructorRoleLabel } from "@/lib/admin-instructors.shared";
import {
  canChangeProfileMembershipRole,
  canDeleteStudentMembership,
  parseProfileMembershipStatusValue,
} from "@/lib/admin-student-membership.shared";
import type { AdminStudentProfilePageData } from "@/lib/admin-student-profile.shared";
import {
  maybeRepairKidsToAdultHistoricalData,
  resolveKidsToAdultMigrationEligibility,
} from "@/lib/admin-migrate-kids-to-adult.server";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import {
  loadStudentBjjFeatureVisibility,
  loadStudentProgrammeBookingAccessForProfile,
  loadStudentProgrammeMembershipForProfile,
} from "@/lib/admin-programmes.server";
import { membershipGrantsAdminDashboardPanel } from "@/lib/admin-auth.shared";
import {
  buildAdminDashboardAccessForProfile,
  createAdminDashboardAccessSummary,
  getAdminAccessSummaryForUser,
} from "@/lib/admin-auth.server";
import { isInstructorPortalMembershipRole } from "@/lib/instructor-portal-auth.shared";
import { getAdminInstructorPortalAuthSummary } from "@/lib/instructor-portal-auth.server";
import {
  formatInstructorPortalAdminLoginLabel,
  instructorPortalLoginCanSignIn,
  normalizeInstructorPortalAuthStatus,
} from "@/lib/instructor-portal-membership-sync.shared";
import { getProfileLoginAccessSummary } from "@/lib/profile-login-access.server";
import { getPortalSetupAdminStatusForMember } from "@/lib/portal-setup.server";
import { getAdminStudentAgreementSummary } from "@/lib/student-portal-agreements.server";
import { getAdminStudentPortalAuthSummary } from "@/lib/student-portal-auth.server";
import { resolveLastSuperAdminWarningForUser } from "@/lib/admin-super-admin.server";
import { loadUserAddressFromUsers } from "@/lib/user-address-field.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface UserProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  original_lead_source?: string | null;
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
  created_at: string | null;
  updated_at: string | null;
}

interface BeltLevelRow {
  id: string;
  name: string;
  stripe_count: number | null;
  sort_order: number;
}

const USER_PROFILE_COLUMNS =
  "id, first_name, last_name, email, phone, date_of_birth, notes, original_lead_source";

async function loadUserProfileRow(userId: string) {
  const supabase = getSupabaseAdminClient();

  let { data, error } = await supabase
    .from("users")
    .select(USER_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error?.message?.includes("original_lead_source")) {
    const fallback = await supabase
      .from("users")
      .select("id, first_name, last_name, email, phone, date_of_birth, notes")
      .eq("id", userId)
      .maybeSingle();

    data = fallback.data
      ? { ...fallback.data, original_lead_source: null }
      : null;
    error = fallback.error;
  }

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
    .select("id, belt_level_id, awarded_at, notes, created_at, updated_at")
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
  await maybeRepairKidsToAdultHistoricalData(userId, clubId);

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
    programmeMembership,
    programmeBookingAccess,
    bjjFeatureVisibility,
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
    loadStudentProgrammeMembershipForProfile(clubId, userId),
    loadStudentProgrammeBookingAccessForProfile(clubId, userId),
    loadStudentBjjFeatureVisibility(clubId, userId),
  ]);
  const lastSuperAdminWarning = await resolveLastSuperAdminWarningForUser(userId);

  const portalSetup = await getPortalSetupAdminStatusForMember({
    userId,
    profileEmail: user.email,
    membershipRole: membership.role,
    membershipStatus: membership.status,
  });

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
        id: award.id,
        created_at: award.created_at,
        updated_at: award.updated_at,
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
  const promotion = isActiveMembershipStatus(membership.status)
    ? buildStudentBeltPromotionAssessment({
        userId,
        latestAward,
        beltLevels,
        requirementsByTargetBeltId,
        juniorRequirementsByFromBeltId,
        bjjAttendance: attendanceSummary,
        logDiagnostics: true,
      })
    : null;
  const leadSource = resolveAdminStudentLeadSource(user.original_lead_source);
  const kidsToAdultMigration = await resolveKidsToAdultMigrationEligibility({
    userId,
    clubId,
    membershipRole: membership.role,
    membershipStatus: membership.status,
  });

  return {
    kidsToAdultMigration,
    leadSource: {
      sourceLabel: leadSource.originalLeadSourceLabel,
    },
    loginAccess,
    portalSetup: {
      statusLabel: portalSetup.statusLabel,
      sentAtLabel: portalSetup.sentAtLabel,
      canSendSetupEmail: portalSetup.canSendSetupEmail,
    },
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
      membershipStatus:
        parseProfileMembershipStatusValue(membership.status ?? "active") ??
        membership.status,
      canChangeRole: canChangeProfileMembershipRole(membership.role),
      canDelete: canDeleteStudentMembership(membership.role),
      lastSuperAdminWarning,
    },
    portalAccess: {
      portalStatusLabel: portalAccess.portalAuthStatusLabel,
      portalLoginEmail: portalAccess.portalLoginEmail,
      inviteSentAt: portalAccess.portalInvitedAt,
      canSetPassword: portalAccess.canSetPassword,
    },
    instructorPortalAccess: instructorPortalAccess
      ? (() => {
          const instructorPortalAuthStatus = normalizeInstructorPortalAuthStatus(
            instructorPortalAccess.portalAuthStatus,
          );

          return {
            portalStatusLabel: instructorPortalAccess.portalAuthStatusLabel,
            portalLoginLabel: formatInstructorPortalAdminLoginLabel({
              portalAuthStatus: instructorPortalAuthStatus,
              hasAuthLogin: Boolean(instructorPortalAccess.authUserId),
              hasInstructorRoleAtAcademy: true,
            }),
            portalLoginEmail: instructorPortalAccess.portalLoginEmail,
            inviteSentAt: instructorPortalAccess.portalInvitedAt,
            canSendInvite: instructorPortalAccess.canSendInvite,
            canSetPassword: instructorPortalAccess.canSetPassword,
            canSignInToInstructorPortal: instructorPortalLoginCanSignIn(
              instructorPortalAuthStatus,
            ),
          };
        })()
      : null,
    showAdminDashboardAccess,
    adminAccess,
    agreementAccess,
    programmeMembership,
    programmeBookingAccess,
    bjjFeatureVisibility,
    attendance,
    belt: {
      currentBeltLabel: formatAdminBeltLabel(currentBelt),
      currentBeltAwardedAt: latestAward?.awarded_at ?? null,
      nextBeltLabel: promotion?.nextBeltLabel ?? null,
      promotion,
    },
  };
}

export type { AdminStudentProfilePageData };
