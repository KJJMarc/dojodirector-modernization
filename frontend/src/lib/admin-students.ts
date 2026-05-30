import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { formatBeltOptionLabel } from "@/lib/admin-belt-levels.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BeltLevel } from "@/types/database";

export interface AdminStudent {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  beltLabel: string;
  beltSortOrder: number | null;
  attendanceTotal: number;
}

export type AdminStudentSortKey =
  | "first_name"
  | "last_name"
  | "email"
  | "belt_level"
  | "attendances"
  | "role";

export type AdminStudentSortDir = "asc" | "desc";

export interface AdminStudentSort {
  key: AdminStudentSortKey;
  dir: AdminStudentSortDir;
}

export const DEFAULT_ADMIN_STUDENT_SORT: AdminStudentSort = {
  key: "last_name",
  dir: "asc",
};

const ADMIN_STUDENT_SORT_KEYS: AdminStudentSortKey[] = [
  "first_name",
  "last_name",
  "email",
  "belt_level",
  "attendances",
  "role",
];

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
  sort_order: number;
}

interface AttendanceRecordRow {
  user_id: string;
}

function compareStrings(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return (left ?? "").localeCompare(right ?? "", "en", { sensitivity: "base" });
}

function compareNameTieBreak(a: AdminStudent, b: AdminStudent) {
  const lastNameCompare = compareStrings(a.lastName, b.lastName);

  if (lastNameCompare !== 0) {
    return lastNameCompare;
  }

  return compareStrings(a.firstName, b.firstName);
}

function beltSortValue(
  sortOrder: number | null,
  direction: AdminStudentSortDir,
) {
  if (sortOrder !== null) {
    return sortOrder;
  }

  return direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
}

export function parseAdminStudentSort(
  sort?: string,
  dir?: string,
): AdminStudentSort {
  const key = ADMIN_STUDENT_SORT_KEYS.includes(sort as AdminStudentSortKey)
    ? (sort as AdminStudentSortKey)
    : DEFAULT_ADMIN_STUDENT_SORT.key;

  return {
    key,
    dir: dir === "desc" ? "desc" : "asc",
  };
}

export function getNextAdminStudentSortDir(
  currentSort: AdminStudentSort,
  columnKey: AdminStudentSortKey,
): AdminStudentSortDir {
  if (currentSort.key === columnKey) {
    return currentSort.dir === "asc" ? "desc" : "asc";
  }

  return "asc";
}

export function buildAdminStudentsListHref(options: {
  clubSlug: string;
  sort: AdminStudentSortKey;
  dir: AdminStudentSortDir;
  searchQuery?: string;
}) {
  const params = new URLSearchParams();
  params.set("sort", options.sort);
  params.set("dir", options.dir);

  if (options.searchQuery) {
    params.set("q", options.searchQuery);
  }

  return `${clubAdminPath(options.clubSlug, "students")}?${params.toString()}`;
}

export function formatAdminBeltLabel(
  belt: Pick<BeltLevel, "name" | "stripe_count"> | null | undefined,
): string {
  if (!belt) {
    return "Not set";
  }

  return formatBeltOptionLabel(belt);
}

export function sortAdminStudents(
  students: AdminStudent[],
  sort: AdminStudentSort = DEFAULT_ADMIN_STUDENT_SORT,
): AdminStudent[] {
  const directionMultiplier = sort.dir === "asc" ? 1 : -1;

  return [...students].sort((a, b) => {
    let primaryCompare = 0;

    switch (sort.key) {
      case "first_name":
        primaryCompare = compareStrings(a.firstName, b.firstName);
        break;
      case "last_name":
        primaryCompare = compareStrings(a.lastName, b.lastName);
        break;
      case "email":
        primaryCompare = compareStrings(a.email, b.email);
        break;
      case "belt_level":
        primaryCompare =
          beltSortValue(a.beltSortOrder, sort.dir) -
          beltSortValue(b.beltSortOrder, sort.dir);
        break;
      case "attendances":
        primaryCompare = a.attendanceTotal - b.attendanceTotal;
        break;
      case "role":
        primaryCompare = compareStrings(a.role, b.role);
        break;
    }

    if (primaryCompare !== 0) {
      return primaryCompare * directionMultiplier;
    }

    if (sort.key === "last_name") {
      return compareStrings(a.firstName, b.firstName) * directionMultiplier;
    }

    return compareNameTieBreak(a, b);
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
    .select("id, name, stripe_count, sort_order")
    .in("id", beltLevelIds);

  if (error) {
    throw new Error(`Failed to load belt levels: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as BeltLevelRow[]).map((beltLevel) => [beltLevel.id, beltLevel]),
  );
}

async function getAttendanceCountsForUsers(userIds: string[], clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("attendance_records")
    .select("user_id")
    .in("user_id", userIds)
    .eq("club_id", clubId);

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
    getAttendanceCountsForUsers(userIds, clubId),
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
      beltSortOrder: beltLevel?.sort_order ?? null,
      attendanceTotal: attendanceCountsByUserId.get(user.id) ?? 0,
    });
  }

  return students;
}

export function formatStudentRole(role: string | null) {
  if (!role) {
    return "—";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}
