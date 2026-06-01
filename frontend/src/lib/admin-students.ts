import { formatBeltOptionLabel } from "@/lib/admin-belt-levels.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
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
  considerPromotion: boolean;
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
  studentsPath?: string;
}) {
  const params = new URLSearchParams();
  params.set("sort", options.sort);
  params.set("dir", options.dir);

  if (options.searchQuery) {
    params.set("q", options.searchQuery);
  }

  const section = options.studentsPath ?? "students";
  return `${clubAdminPath(options.clubSlug, section)}?${params.toString()}`;
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

export function formatStudentRole(role: string | null) {
  if (!role) {
    return "—";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}
