import { formatBeltOptionLabel } from "@/lib/admin-belt-levels.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  formatAnalyticsLeadSourceLabel,
  normalizeLeadSourceForAnalytics,
  type AnalyticsLeadSource,
} from "@/lib/lead-source-analytics.shared";
import {
  isActiveMembershipStatus,
  isInactiveMembershipStatus,
  isPausedMembershipStatus,
} from "@/lib/membership-status.shared";
import { BeltLevel } from "@/types/database";

export type AdminStudentListStatusFilter = "active" | "all" | "paused" | "inactive";

export const DEFAULT_ADMIN_STUDENT_STATUS_FILTER: AdminStudentListStatusFilter =
  "all";

export const ADMIN_STUDENT_LIST_STATUS_FILTER_OPTIONS: {
  value: AdminStudentListStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All Students" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "inactive", label: "Inactive" },
];

export interface AdminStudent {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  membershipStatus: string | null;
  originalLeadSource: AnalyticsLeadSource | null;
  originalLeadSourceLabel: string | null;
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

export function parseAdminStudentStatusFilter(
  value?: string,
): AdminStudentListStatusFilter {
  if (
    value === "active" ||
    value === "all" ||
    value === "paused" ||
    value === "inactive"
  ) {
    return value;
  }

  return DEFAULT_ADMIN_STUDENT_STATUS_FILTER;
}

export function matchesAdminStudentListStatusFilter(
  status: string | null | undefined,
  filter: AdminStudentListStatusFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "paused":
      return isPausedMembershipStatus(status);
    case "inactive":
      return isInactiveMembershipStatus(status);
    default:
      return isActiveMembershipStatus(status);
  }
}

export function formatAdminStudentCountLabel(options: {
  count: number;
  filter: AdminStudentListStatusFilter;
  memberLabel: string;
  memberLabelPlural: string;
  visibleCount?: number;
}): string {
  const { count, filter, memberLabel, memberLabelPlural, visibleCount } = options;
  const noun = count === 1 ? memberLabel : memberLabelPlural;
  const statusPrefix =
    filter === "active"
      ? "Active "
      : filter === "paused"
        ? "Paused "
        : filter === "inactive"
          ? "Inactive "
          : "";

  const baseLabel = `${count} ${statusPrefix}${noun}`.replace(/\s+/g, " ").trim();

  if (
    visibleCount !== undefined &&
    visibleCount !== count &&
    visibleCount >= 0
  ) {
    return `${visibleCount} of ${baseLabel}`;
  }

  return baseLabel;
}

export function buildAdminStudentsListHref(options: {
  clubSlug: string;
  sort: AdminStudentSortKey;
  dir: AdminStudentSortDir;
  searchQuery?: string;
  studentsPath?: string;
  statusFilter?: AdminStudentListStatusFilter;
}) {
  const params = new URLSearchParams();
  params.set("sort", options.sort);
  params.set("dir", options.dir);

  if (options.searchQuery) {
    params.set("q", options.searchQuery);
  }

  const statusFilter = options.statusFilter ?? DEFAULT_ADMIN_STUDENT_STATUS_FILTER;

  if (statusFilter !== DEFAULT_ADMIN_STUDENT_STATUS_FILTER) {
    params.set("status", statusFilter);
  }

  const section = options.studentsPath ?? "students";
  return `${clubAdminPath(options.clubSlug, section)}?${params.toString()}`;
}

export function formatAdminBeltLabel(
  belt:
    | (Pick<BeltLevel, "name" | "stripe_count"> & {
        belt_category?: string | null;
        type?: string | null;
      })
    | null
    | undefined,
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

  return students.filter((student) => {
    if (!normalizedQuery) {
      return true;
    }

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

export function resolveAdminStudentLeadSource(
  value: string | null | undefined,
): Pick<AdminStudent, "originalLeadSource" | "originalLeadSourceLabel"> {
  const originalLeadSource = normalizeLeadSourceForAnalytics(value);

  return {
    originalLeadSource,
    originalLeadSourceLabel: originalLeadSource
      ? formatAnalyticsLeadSourceLabel(originalLeadSource)
      : null,
  };
}

export function formatStudentRole(role: string | null) {
  if (!role) {
    return "—";
  }

  if (role === "super_admin") {
    return "Super Admin";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}
