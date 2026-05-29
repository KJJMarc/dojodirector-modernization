import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BeltLevel } from "@/types/database";

export interface AdminStudent {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  beltLabel: string;
  attendanceTotal: number;
}

interface MembershipRow {
  user_id: string;
  role: string | null;
  status: string | null;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface GradeAwardRow {
  user_id: string;
  belt_level_id: string | null;
  awarded_at: string;
}

interface BeltLevelRow {
  id: string;
  name: string;
  stripe_count: number | null;
}

interface AttendanceRecordRow {
  user_id: string;
}

export function formatAdminBeltLabel(
  belt: Pick<BeltLevel, "name" | "stripe_count"> | null | undefined,
): string {
  if (!belt) {
    return "Not set";
  }

  const stripeCount = belt.stripe_count ?? 0;

  if (stripeCount > 0) {
    return `${belt.name}, ${stripeCount} Stripe${stripeCount === 1 ? "" : "s"}`;
  }

  return belt.name;
}

export function sortAdminStudents(students: AdminStudent[]): AdminStudent[] {
  return [...students].sort((a, b) => {
    const lastNameCompare = (a.lastName ?? "").localeCompare(
      b.lastName ?? "",
      "en",
      { sensitivity: "base" },
    );

    if (lastNameCompare !== 0) {
      return lastNameCompare;
    }

    return (a.firstName ?? "").localeCompare(b.firstName ?? "", "en", {
      sensitivity: "base",
    });
  });
}

export function filterAdminStudents(
  students: AdminStudent[],
  query?: string,
): AdminStudent[] {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return students;
  }

  return students.filter((student) => {
    const firstName = student.firstName?.toLowerCase() ?? "";
    const lastName = student.lastName?.toLowerCase() ?? "";
    const email = student.email?.toLowerCase() ?? "";

    return (
      firstName.includes(normalizedQuery) ||
      lastName.includes(normalizedQuery) ||
      email.includes(normalizedQuery)
    );
  });
}

function getLatestGradeAwardByUserId(gradeAwards: GradeAwardRow[]) {
  const latestByUserId = new Map<string, GradeAwardRow>();

  for (const award of gradeAwards) {
    if (!latestByUserId.has(award.user_id)) {
      latestByUserId.set(award.user_id, award);
    }
  }

  return latestByUserId;
}

function getAttendanceCountsByUserId(records: AttendanceRecordRow[]) {
  const countsByUserId = new Map<string, number>();

  for (const record of records) {
    countsByUserId.set(
      record.user_id,
      (countsByUserId.get(record.user_id) ?? 0) + 1,
    );
  }

  return countsByUserId;
}

async function getLatestGradeAwardsForUsers(
  userIds: string[],
  clubId: string,
) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("grade_awards")
    .select("user_id, belt_level_id, awarded_at")
    .in("user_id", userIds)
    .eq("club_id", clubId)
    .order("awarded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load grade awards: ${error.message}`);
  }

  return getLatestGradeAwardByUserId((data ?? []) as GradeAwardRow[]);
}

async function getBeltLevelsById(beltLevelIds: string[]) {
  if (beltLevelIds.length === 0) {
    return new Map<string, BeltLevelRow>();
  }

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("belt_levels")
    .select("id, name, stripe_count")
    .in("id", beltLevelIds);

  if (error) {
    throw new Error(`Failed to load belt levels: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as BeltLevelRow[]).map((beltLevel) => [beltLevel.id, beltLevel]),
  );
}

async function getAttendanceCountsForUsers(userIds: string[]) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("attendance_records")
    .select("user_id")
    .in("user_id", userIds);

  if (error) {
    throw new Error(`Failed to load attendance totals: ${error.message}`);
  }

  return getAttendanceCountsByUserId((data ?? []) as AttendanceRecordRow[]);
}

export async function getClubStudents(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminStudent[]> {
  const supabase = getSupabaseAdminClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("user_id, role, status")
    .eq("club_id", clubId);

  if (membershipsError) {
    throw new Error(`Failed to load students: ${membershipsError.message}`);
  }

  const membershipRows = (memberships ?? []) as MembershipRow[];

  if (membershipRows.length === 0) {
    return [];
  }

  const userIds = Array.from(
    new Set(membershipRows.map((membership) => membership.user_id)),
  );

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  if (usersError) {
    throw new Error(`Failed to load student profiles: ${usersError.message}`);
  }

  const [latestGradeAwardByUserId, attendanceCountsByUserId] = await Promise.all([
    getLatestGradeAwardsForUsers(userIds, clubId),
    getAttendanceCountsForUsers(userIds),
  ]);

  const beltLevelIds = Array.from(
    new Set(
      Array.from(latestGradeAwardByUserId.values())
        .map((award) => award.belt_level_id)
        .filter((beltLevelId): beltLevelId is string => Boolean(beltLevelId)),
    ),
  );

  const beltLevelById = await getBeltLevelsById(beltLevelIds);

  const userById = new Map(
    ((users ?? []) as UserRow[]).map((user) => [user.id, user]),
  );

  const students: AdminStudent[] = [];

  for (const membership of membershipRows) {
    const user = userById.get(membership.user_id);

    if (!user) {
      continue;
    }

    const latestAward = latestGradeAwardByUserId.get(user.id);
    const beltLevel = latestAward?.belt_level_id
      ? beltLevelById.get(latestAward.belt_level_id)
      : null;

    students.push({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: membership.role,
      beltLabel: formatAdminBeltLabel(beltLevel),
      attendanceTotal: attendanceCountsByUserId.get(user.id) ?? 0,
    });
  }

  return sortAdminStudents(students);
}

export function formatStudentRole(role: string | null) {
  if (!role) {
    return "—";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}
