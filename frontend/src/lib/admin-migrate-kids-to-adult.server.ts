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
import {
  KIDS_ADULT_MIGRATION_GRADE_AWARD_NOTE_PREFIX,
  type KidsToAdultMigrationEligibility,
} from "@/lib/admin-migrate-kids-to-adult.shared";
import {
  getPortalUserByStudentId,
  sendStudentPortalInvite,
} from "@/lib/student-portal-auth.server";
import { resolvePortalLoginEmail } from "@/lib/student-portal-auth.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ADULT_PROGRAMME_TYPES: StudentPortalAccessProgrammeType[] = ["bjj"];

interface BeltLevelRow {
  id: string;
  name: string;
  belt_category: string | null;
  stripe_count: number | null;
}

interface AttendanceRecordRow {
  id: string;
  attended_on: string;
  class_session_id: string | null;
}

interface GradeAwardRow {
  id: string;
  belt_level_id: string | null;
  awarded_at: string;
  notes: string | null;
}

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

function beltLevelMatchKey(row: {
  name: string;
  belt_category: string | null;
  stripe_count: number | null;
}) {
  return `${row.name}|${row.belt_category ?? "adult"}|${row.stripe_count ?? -1}`;
}

function buildKidsAdultMigrationGradeAwardNote(sourceAwardId: string) {
  return `${KIDS_ADULT_MIGRATION_GRADE_AWARD_NOTE_PREFIX}:source_award_id:${sourceAwardId}`;
}

function parseKidsAdultMigrationSourceAwardId(notes: string | null) {
  if (!notes) {
    return null;
  }

  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    const prefix = `${KIDS_ADULT_MIGRATION_GRADE_AWARD_NOTE_PREFIX}:source_award_id:`;

    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }

  return null;
}

async function loadBeltLevelsForClub(clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, belt_category, stripe_count")
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Unable to load belt levels: ${error.message}`);
  }

  return (data ?? []) as BeltLevelRow[];
}

async function buildKidsToAdultBeltLevelMap(kidsClubId: string, adultClubId: string) {
  const [kidsBelts, adultBelts] = await Promise.all([
    loadBeltLevelsForClub(kidsClubId),
    loadBeltLevelsForClub(adultClubId),
  ]);

  const adultBeltIdByKey = new Map(
    adultBelts.map((belt) => [beltLevelMatchKey(belt), belt.id]),
  );
  const beltMap = new Map<string, string>();

  for (const kidsBelt of kidsBelts) {
    const adultBeltId = adultBeltIdByKey.get(beltLevelMatchKey(kidsBelt));

    if (adultBeltId) {
      beltMap.set(kidsBelt.id, adultBeltId);
    }
  }

  return beltMap;
}

async function countAttendanceRecords(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Unable to count attendance records: ${error.message}`);
  }

  return count ?? 0;
}

async function countGradeAwards(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("grade_awards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Unable to count grade awards: ${error.message}`);
  }

  return count ?? 0;
}

function attendanceRecordKey(attendedOn: string, classSessionId: string | null) {
  return `${attendedOn}|${classSessionId ?? ""}`;
}

async function transferKidsAttendanceRecordsToAdult(
  userId: string,
  kidsClubId: string,
  adultClubId: string,
) {
  const supabase = getSupabaseAdminClient();

  const { data: kidsRecords, error: kidsError } = await supabase
    .from("attendance_records")
    .select("id, attended_on, class_session_id")
    .eq("user_id", userId)
    .eq("club_id", kidsClubId);

  if (kidsError) {
    throw new Error(`Unable to load Kids attendance records: ${kidsError.message}`);
  }

  if (!kidsRecords?.length) {
    return 0;
  }

  const { data: adultRecords, error: adultError } = await supabase
    .from("attendance_records")
    .select("attended_on, class_session_id")
    .eq("user_id", userId)
    .eq("club_id", adultClubId);

  if (adultError) {
    throw new Error(`Unable to load adult attendance records: ${adultError.message}`);
  }

  const adultKeys = new Set(
    ((adultRecords ?? []) as AttendanceRecordRow[]).map((record) =>
      attendanceRecordKey(record.attended_on, record.class_session_id),
    ),
  );

  let transferred = 0;

  for (const record of kidsRecords as AttendanceRecordRow[]) {
    const key = attendanceRecordKey(record.attended_on, record.class_session_id);

    if (adultKeys.has(key)) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("attendance_records")
      .update({ club_id: adultClubId })
      .eq("id", record.id);

    if (updateError) {
      throw new Error(
        `Unable to transfer attendance record ${record.id}: ${updateError.message}`,
      );
    }

    transferred += 1;
    adultKeys.add(key);
  }

  return transferred;
}

async function copyKidsGradeAwardsToAdult(
  userId: string,
  kidsClubId: string,
  adultClubId: string,
  beltMap: Map<string, string>,
) {
  const supabase = getSupabaseAdminClient();

  const { data: kidsAwards, error: kidsError } = await supabase
    .from("grade_awards")
    .select("id, belt_level_id, awarded_at, notes")
    .eq("user_id", userId)
    .eq("club_id", kidsClubId)
    .order("awarded_at", { ascending: true });

  if (kidsError) {
    throw new Error(`Unable to load Kids grade awards: ${kidsError.message}`);
  }

  if (!kidsAwards?.length) {
    return 0;
  }

  const { data: adultAwards, error: adultError } = await supabase
    .from("grade_awards")
    .select("notes")
    .eq("user_id", userId)
    .eq("club_id", adultClubId);

  if (adultError) {
    throw new Error(`Unable to load adult grade awards: ${adultError.message}`);
  }

  const copiedSourceAwardIds = new Set(
    ((adultAwards ?? []) as GradeAwardRow[])
      .map((award) => parseKidsAdultMigrationSourceAwardId(award.notes))
      .filter((value): value is string => Boolean(value)),
  );

  let copied = 0;

  for (const award of kidsAwards as GradeAwardRow[]) {
    if (copiedSourceAwardIds.has(award.id)) {
      continue;
    }

    const mappedBeltLevelId = award.belt_level_id
      ? (beltMap.get(award.belt_level_id) ?? null)
      : null;

    if (award.belt_level_id && !mappedBeltLevelId) {
      console.warn("[copyKidsGradeAwardsToAdult] unmapped belt level", {
        userId,
        sourceAwardId: award.id,
        beltLevelId: award.belt_level_id,
      });
      continue;
    }

    const migrationNote = buildKidsAdultMigrationGradeAwardNote(award.id);
    const notes = award.notes?.trim()
      ? `${award.notes.trim()}\n${migrationNote}`
      : migrationNote;

    const { error: insertError } = await supabase.from("grade_awards").insert({
      user_id: userId,
      club_id: adultClubId,
      belt_level_id: mappedBeltLevelId,
      awarded_at: award.awarded_at,
      notes,
    });

    if (insertError) {
      throw new Error(`Unable to copy grade award ${award.id}: ${insertError.message}`);
    }

    copied += 1;
    copiedSourceAwardIds.add(award.id);
  }

  return copied;
}

export async function transferKidsHistoricalDataToAdultClub(input: {
  userId: string;
  kidsClubId: string;
  adultClubId: string;
}) {
  const beltMap = await buildKidsToAdultBeltLevelMap(input.kidsClubId, input.adultClubId);
  const attendanceTransferred = await transferKidsAttendanceRecordsToAdult(
    input.userId,
    input.kidsClubId,
    input.adultClubId,
  );
  const gradeAwardsCopied = await copyKidsGradeAwardsToAdult(
    input.userId,
    input.kidsClubId,
    input.adultClubId,
    beltMap,
  );

  console.info("[transferKidsHistoricalDataToAdultClub] completed", {
    userId: input.userId,
    kidsClubId: input.kidsClubId,
    adultClubId: input.adultClubId,
    attendanceTransferred,
    gradeAwardsCopied,
  });

  return {
    attendanceTransferred,
    gradeAwardsCopied,
  };
}

async function kidsHistoricalDataNeedsTransfer(
  userId: string,
  kidsClubId: string,
  adultClubId: string,
) {
  const [kidsAttendanceCount, adultAttendanceCount, kidsAwardCount, adultAwardCount] =
    await Promise.all([
      countAttendanceRecords(userId, kidsClubId),
      countAttendanceRecords(userId, adultClubId),
      countGradeAwards(userId, kidsClubId),
      countGradeAwards(userId, adultClubId),
    ]);

  return (
    kidsAttendanceCount > adultAttendanceCount || kidsAwardCount > adultAwardCount
  );
}

export async function maybeRepairKidsToAdultHistoricalData(
  userId: string,
  clubId: string,
) {
  if (clubId !== ACTIVE_CLUB_ID) {
    return null;
  }

  const [kidsMembership, adultMembership] = await Promise.all([
    loadMembershipForClub(userId, KINGSTON_JIU_JITSU_KIDS_CLUB_ID),
    loadMembershipForClub(userId, ACTIVE_CLUB_ID),
  ]);

  if (!kidsMembership || !adultMembership) {
    return null;
  }

  if (!isActiveMembershipStatus(adultMembership.status)) {
    return null;
  }

  if (isActiveMembershipStatus(kidsMembership.status)) {
    return null;
  }

  const needsTransfer = await kidsHistoricalDataNeedsTransfer(
    userId,
    KINGSTON_JIU_JITSU_KIDS_CLUB_ID,
    ACTIVE_CLUB_ID,
  );

  if (!needsTransfer) {
    return null;
  }

  return transferKidsHistoricalDataToAdultClub({
    userId,
    kidsClubId: KINGSTON_JIU_JITSU_KIDS_CLUB_ID,
    adultClubId: ACTIVE_CLUB_ID,
  });
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
    return { portalInviteSent: false, portalInviteError: null };
  }

  try {
    await sendStudentPortalInvite({
      userId,
      clubId: adultClubId,
    });

    return { portalInviteSent: true, portalInviteError: null };
  } catch (error) {
    const portalInviteError =
      error instanceof Error ? error.message : "Unable to send portal invite.";

    console.error("[ensureAdultStudentPortalAccess] portal invite failed", {
      userId,
      adultClubId,
      message: portalInviteError,
    });

    return { portalInviteSent: false, portalInviteError };
  }
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
  const historyTransfer = await transferKidsHistoricalDataToAdultClub({
    userId: input.userId,
    kidsClubId: kidsClub.id,
    adultClubId: adultClub.id,
  });
  const portalResult = await ensureAdultStudentPortalAccess(input.userId, adultClub.id);

  console.info("[adminMigrateKidsStudentToAdultProgramme] completed", {
    userId: input.userId,
    kidsClubId: kidsClub.id,
    adultClubId: adultClub.id,
    portalInviteSent: portalResult.portalInviteSent,
    portalInviteError: portalResult.portalInviteError,
    attendanceTransferred: historyTransfer.attendanceTransferred,
    gradeAwardsCopied: historyTransfer.gradeAwardsCopied,
  });

  return {
    adultClubSlug: adultClub.slug,
    portalInviteSent: portalResult.portalInviteSent,
    portalInviteError: portalResult.portalInviteError,
    attendanceTransferred: historyTransfer.attendanceTransferred,
    gradeAwardsCopied: historyTransfer.gradeAwardsCopied,
  };
}
