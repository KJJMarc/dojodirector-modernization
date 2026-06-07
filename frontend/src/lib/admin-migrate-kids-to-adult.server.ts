import "server-only";

import { getTodayJoinedAtDate } from "@/lib/admin-create-student.shared";
import {
  ensureProgrammeBookingAccessForUser,
  ensureProgrammeMembershipForUser,
  updateStudentProgrammeBookingAccess,
  updateStudentProgrammeMemberships,
} from "@/lib/admin-programmes.server";
import type { StudentPortalAccessProgrammeType } from "@/lib/admin-programmes.shared";
import { adminUpdateMembershipStatus } from "@/lib/admin-student-membership.server";
import {
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_ID,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import { getClubBySlug } from "@/lib/clubs.server";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  isActiveMembershipStatus,
  isPausedMembershipStatus,
} from "@/lib/membership-status.shared";
import type { KidsToAdultMigrationEligibility } from "@/lib/admin-migrate-kids-to-adult.shared";
import {
  getPortalUserByStudentId,
  sendStudentPortalInvite,
} from "@/lib/student-portal-auth.server";
import { resolvePortalLoginEmail } from "@/lib/student-portal-auth.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ADULT_PROGRAMME_TYPES: StudentPortalAccessProgrammeType[] = ["bjj"];

interface MembershipRow {
  role: string | null;
  status: string | null;
}

async function loadMembershipForClub(
  userId: string,
  clubId: string,
): Promise<MembershipRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, status")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load membership: ${error.message}`);
  }

  return (data as MembershipRow | null) ?? null;
}

async function deactivateKidsProgrammeAccess(userId: string, kidsClubId: string) {
  await updateStudentProgrammeMemberships({
    clubId: kidsClubId,
    userId,
    programmeIds: [],
  });
  await updateStudentProgrammeBookingAccess({
    clubId: kidsClubId,
    userId,
    programmeIds: [],
  });
}

async function ensureAdultAcademyMembership(userId: string, adultClubId: string) {
  const supabase = getSupabaseAdminClient();
  const existing = await loadMembershipForClub(userId, adultClubId);

  if (existing) {
    if (existing.role !== "student") {
      throw new Error(
        "This student already has a non-student membership at Kingston Jiu Jitsu.",
      );
    }

    if (!isActiveMembershipStatus(existing.status)) {
      const { error } = await supabase
        .from("memberships")
        .update({ status: "active" })
        .eq("user_id", userId)
        .eq("club_id", adultClubId);

      if (error) {
        throw new Error(`Unable to activate adult membership: ${error.message}`);
      }
    }

    return;
  }

  const { error } = await supabase.from("memberships").insert({
    user_id: userId,
    club_id: adultClubId,
    role: "student",
    status: "active",
    joined_at: getTodayJoinedAtDate(),
  });

  if (error) {
    throw new Error(`Unable to create adult membership: ${error.message}`);
  }
}

async function grantAdultProgrammeAccess(userId: string, adultClubId: string) {
  await ensureProgrammeMembershipForUser({
    clubId: adultClubId,
    userId,
    programmeTypes: ADULT_PROGRAMME_TYPES,
    status: "active",
  });
  await ensureProgrammeBookingAccessForUser({
    clubId: adultClubId,
    userId,
    programmeTypes: ADULT_PROGRAMME_TYPES,
  });
}

async function ensureAdultStudentPortalAccess(userId: string, adultClubId: string) {
  const portalUser = await getPortalUserByStudentId(userId);

  if (!portalUser) {
    throw new Error("Student not found.");
  }

  const loginEmail = resolvePortalLoginEmail(
    portalUser.portalLoginEmail,
    portalUser.email,
  );

  if (!loginEmail) {
    throw new Error(
      "Add an email address to this student before migrating to the adult programme.",
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!portalUser.portalLoginEmail) {
    const { error } = await supabase
      .from("users")
      .update({ portal_login_email: loginEmail })
      .eq("id", userId);

    if (error) {
      throw new Error(`Unable to save portal login email: ${error.message}`);
    }
  }

  if (portalUser.portalAuthStatus === "active" && portalUser.authUserId) {
    return { portalInviteSent: false };
  }

  await sendStudentPortalInvite({
    userId,
    clubId: adultClubId,
  });

  return { portalInviteSent: true };
}

export async function resolveKidsToAdultMigrationEligibility(input: {
  userId: string;
  clubId: string;
  membershipRole: string | null;
  membershipStatus: string | null;
}): Promise<KidsToAdultMigrationEligibility> {
  if (input.clubId !== KINGSTON_JIU_JITSU_KIDS_CLUB_ID) {
    return { canMigrate: false, disabledReason: null };
  }

  if (input.membershipRole !== "student") {
    return {
      canMigrate: false,
      disabledReason: "Only student memberships can be migrated to the adult programme.",
    };
  }

  const adultMembership = await loadMembershipForClub(input.userId, ACTIVE_CLUB_ID);
  const kidsMembershipIsCurrent =
    isActiveMembershipStatus(input.membershipStatus) ||
    isPausedMembershipStatus(input.membershipStatus);

  if (
    !kidsMembershipIsCurrent &&
    isActiveMembershipStatus(adultMembership?.status ?? null)
  ) {
    return {
      canMigrate: false,
      disabledReason: "This student has already been migrated to Kingston Jiu Jitsu.",
    };
  }

  if (!kidsMembershipIsCurrent) {
    return {
      canMigrate: false,
      disabledReason:
        "Activate this student's Kids membership before migrating, or add them directly at Kingston Jiu Jitsu.",
    };
  }

  return { canMigrate: true, disabledReason: null };
}

export async function adminMigrateKidsStudentToAdultProgramme(input: {
  userId: string;
  kidsClubId: string;
}) {
  if (!input.userId) {
    throw new Error("Missing student id.");
  }

  if (input.kidsClubId !== KINGSTON_JIU_JITSU_KIDS_CLUB_ID) {
    throw new Error("Migration is only available from Kingston Jiu Jitsu Kids.");
  }

  const [kidsClub, adultClub] = await Promise.all([
    getClubBySlug(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG),
    getClubBySlug(KINGSTON_CLUB_SLUG),
  ]);

  if (!kidsClub) {
    throw new Error("Kingston Jiu Jitsu Kids academy could not be found.");
  }

  if (!adultClub || adultClub.id !== ACTIVE_CLUB_ID) {
    throw new Error("Kingston Jiu Jitsu academy could not be found.");
  }

  const kidsMembership = await loadMembershipForClub(input.userId, kidsClub.id);

  if (!kidsMembership) {
    throw new Error("Student not found at Kingston Jiu Jitsu Kids.");
  }

  const eligibility = await resolveKidsToAdultMigrationEligibility({
    userId: input.userId,
    clubId: kidsClub.id,
    membershipRole: kidsMembership.role,
    membershipStatus: kidsMembership.status,
  });

  if (!eligibility.canMigrate) {
    throw new Error(
      eligibility.disabledReason ?? "This student cannot be migrated to the adult programme.",
    );
  }

  await adminUpdateMembershipStatus({
    userId: input.userId,
    clubId: kidsClub.id,
    status: "inactive",
  });
  await deactivateKidsProgrammeAccess(input.userId, kidsClub.id);
  await ensureAdultAcademyMembership(input.userId, adultClub.id);
  await grantAdultProgrammeAccess(input.userId, adultClub.id);
  const portalResult = await ensureAdultStudentPortalAccess(input.userId, adultClub.id);

  console.info("[adminMigrateKidsStudentToAdultProgramme] completed", {
    userId: input.userId,
    kidsClubId: kidsClub.id,
    adultClubId: adultClub.id,
    portalInviteSent: portalResult.portalInviteSent,
  });

  return {
    adultClubSlug: adultClub.slug,
    portalInviteSent: portalResult.portalInviteSent,
  };
}
