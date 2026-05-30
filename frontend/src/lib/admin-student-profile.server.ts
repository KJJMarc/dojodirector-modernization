import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { formatAdminBeltLabel } from "@/lib/admin-students";
import { formatInstructorRoleLabel } from "@/lib/admin-instructors.shared";
import {
  canChangeProfileMembershipRole,
  canDeleteStudentMembership,
} from "@/lib/admin-student-membership.shared";
import type { AdminStudentProfilePageData } from "@/lib/admin-student-profile.shared";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface UserProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  notes: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
}

interface MembershipRow {
  role: string | null;
  status: string | null;
  notes: string | null;
}

interface AttendanceRecordRow {
  id: string;
  attended_on: string;
  class_session_id: string | null;
}

interface ClassSessionRow {
  id: string;
  class_id: string;
}

interface ClassRow {
  id: string;
  programme_type: string;
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

function formatStudentAddress(user: Partial<UserProfileRow>) {
  const parts = [
    user.address_line_1,
    user.address_line_2,
    user.city,
    user.county,
    user.postcode,
    user.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

async function loadUserAddress(userId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("addresses")
    .select("line_1, line_2, city, county, postcode, country")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return formatStudentAddress({
    address_line_1: data.line_1,
    address_line_2: data.line_2,
    city: data.city,
    county: data.county,
    postcode: data.postcode,
    country: data.country,
  });
}

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

  const address = await loadUserAddress(userId);

  return {
    user: data as UserProfileRow,
    address,
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

async function loadBeltLevelsForClub(clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count, sort_order")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load belt levels: ${error.message}`);
  }

  return (data ?? []) as BeltLevelRow[];
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

function getProgrammeTypeForSession(
  sessionId: string | null,
  sessionById: Map<string, ClassSessionRow>,
  programmeByClassId: Map<string, string>,
) {
  if (!sessionId) {
    return "bjj";
  }

  const session = sessionById.get(sessionId);

  if (!session) {
    return null;
  }

  return programmeByClassId.get(session.class_id) ?? null;
}

async function loadBjjAttendanceSummary(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("attendance_records")
    .select("id, attended_on, class_session_id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .order("attended_on", { ascending: false });

  if (error) {
    throw new Error(`Failed to load attendance records: ${error.message}`);
  }

  const records = (data ?? []) as AttendanceRecordRow[];

  if (records.length === 0) {
    return {
      lifetimeBjjCount: 0,
      lastAttendanceDate: null,
    };
  }

  const sessionIds = Array.from(
    new Set(
      records
        .map((record) => record.class_session_id)
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
    ),
  );

  const sessionById = new Map<string, ClassSessionRow>();
  const programmeByClassId = new Map<string, string>();

  if (sessionIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from("class_sessions")
      .select("id, class_id")
      .in("id", sessionIds);

    if (sessionsError) {
      throw new Error(`Failed to load class sessions: ${sessionsError.message}`);
    }

    const classIds = Array.from(
      new Set(
        ((sessions ?? []) as ClassSessionRow[]).map((session) => session.class_id),
      ),
    );

    for (const session of (sessions ?? []) as ClassSessionRow[]) {
      sessionById.set(session.id, session);
    }

    if (classIds.length > 0) {
      const { data: classes, error: classesError } = await supabase
        .from("classes")
        .select("id, programme_type")
        .in("id", classIds);

      if (classesError) {
        throw new Error(`Failed to load classes: ${classesError.message}`);
      }

      for (const classRow of (classes ?? []) as ClassRow[]) {
        programmeByClassId.set(classRow.id, classRow.programme_type);
      }
    }
  }

  const bjjRecords = records.filter((record) => {
    const programmeType = getProgrammeTypeForSession(
      record.class_session_id,
      sessionById,
      programmeByClassId,
    );

    return programmeType === "bjj";
  });

  return {
    lifetimeBjjCount: bjjRecords.length,
    lastAttendanceDate: bjjRecords[0]?.attended_on ?? null,
  };
}

function getNextBeltLevel(
  currentBeltLevelId: string | null,
  beltLevels: BeltLevelRow[],
) {
  if (beltLevels.length === 0) {
    return null;
  }

  if (!currentBeltLevelId) {
    return beltLevels[0] ?? null;
  }

  const current = beltLevels.find((belt) => belt.id === currentBeltLevelId);

  if (!current) {
    return null;
  }

  return (
    beltLevels.find((belt) => belt.sort_order > current.sort_order) ?? null
  );
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
  const [{ user, address }, membership, beltLevels, gradeAwards, attendance] =
    await Promise.all([
      loadUserProfileRow(userId),
      loadMembershipRow(userId, clubId),
      loadBeltLevelsForClub(clubId),
      loadGradeAwards(userId, clubId),
      loadBjjAttendanceSummary(userId, clubId),
    ]);

  const beltLevelById = new Map(
    beltLevels.map((beltLevel) => [beltLevel.id, beltLevel]),
  );

  const latestAward = gradeAwards[0] ?? null;
  const currentBelt = latestAward?.belt_level_id
    ? beltLevelById.get(latestAward.belt_level_id) ?? null
    : null;
  const nextBelt = getNextBeltLevel(
    latestAward?.belt_level_id ?? null,
    beltLevels,
  );

  return {
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
    attendance,
    belt: {
      currentBeltLabel: formatAdminBeltLabel(currentBelt),
      currentBeltAwardedAt: latestAward?.awarded_at ?? null,
      nextBeltLabel: nextBelt ? formatAdminBeltLabel(nextBelt) : null,
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
