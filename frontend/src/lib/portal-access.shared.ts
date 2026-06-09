import { clubAdminPath } from "@/lib/clubs.shared";
import { formatMembershipInstructorRoleLabel } from "@/lib/instructor-portal-membership-sync.shared";
import { isInstructorPortalMembershipRole } from "@/lib/instructor-portal-auth.shared";
import {
  buildPortalSetupAdminStatus,
  canAdminSendPortalSetupEmail,
} from "@/lib/portal-setup.shared";
import {
  formatPortalAuthStatusLabel,
  type PortalAuthStatus,
} from "@/lib/student-portal-auth.shared";

function normalizePortalAuthStatus(value: string | null | undefined): PortalAuthStatus {
  if (value === "invited" || value === "active") {
    return value;
  }

  return "not_invited";
}

export const PORTAL_ACCESS_SEND_CONFIRMATION_TEXT = "SEND";

/** @deprecated Use PORTAL_ACCESS_SEND_CONFIRMATION_TEXT */
export const PORTAL_ACCESS_BULK_CONFIRMATION_TEXT = PORTAL_ACCESS_SEND_CONFIRMATION_TEXT;

export function clubPortalAccessPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "messaging/portal-access");
}

export function isValidPortalSetupEmail(email: string | null | undefined) {
  const trimmed = email?.trim();

  return Boolean(trimmed && trimmed.includes("@"));
}

export function isBulkPortalSetupEligible(input: {
  profileEmail: string | null;
  membershipStatus: string | null;
  portalAuthStatus: string | null;
  portalInvitedAt: string | null;
  instructorPortalAuthStatus?: string | null;
  instructorPortalInvitedAt?: string | null;
  membershipRole?: string | null;
  hasInstructorPortalMembershipAnywhere?: boolean;
}) {
  if (!canAdminSendPortalSetupEmail(input)) {
    return false;
  }

  const status = buildPortalSetupAdminStatus({
    profileEmail: input.profileEmail,
    portalAuthStatus: input.portalAuthStatus,
    portalInvitedAt: input.portalInvitedAt,
    instructorPortalAuthStatus: input.instructorPortalAuthStatus ?? null,
    instructorPortalInvitedAt: input.instructorPortalInvitedAt ?? null,
    membershipRole: input.membershipRole ?? null,
    hasSuperAdminMembership: false,
    hasInstructorPortalMembershipAnywhere:
      input.hasInstructorPortalMembershipAnywhere ?? false,
  });

  return status.canSendSetupEmail;
}

export function formatPortalAccessMembershipRole(role: string | null | undefined) {
  return formatMembershipInstructorRoleLabel(role);
}

export function formatStudentPortalStatusLabel(status: string | null | undefined) {
  return formatPortalAuthStatusLabel(normalizePortalAuthStatus(status));
}

export function formatInstructorPortalStatusLabel(
  membershipRole: string | null | undefined,
  status: string | null | undefined,
) {
  if (!isInstructorPortalMembershipRole(membershipRole)) {
    return null;
  }

  return formatPortalAuthStatusLabel(normalizePortalAuthStatus(status));
}

export interface PortalAccessMemberSummary {
  userId: string;
  fullName: string;
  email: string | null;
  membershipRole: string | null;
  membershipRoleLabel: string;
  studentPortalStatusLabel: string;
  instructorPortalStatusLabel: string | null;
  lastPortalInviteLabel: string | null;
  /** ISO timestamp for sorting; null when never invited. */
  lastPortalInviteAt: string | null;
  canSendSetupEmail: boolean;
  isBulkEligible: boolean;
}

export type PortalAccessEligibleSortKey = "name" | "email" | "role" | "last_invite";

export type PortalAccessEligibleSortDir = "asc" | "desc";

export interface PortalAccessEligibleSort {
  key: PortalAccessEligibleSortKey;
  dir: PortalAccessEligibleSortDir;
}

export const DEFAULT_PORTAL_ACCESS_ELIGIBLE_SORT: PortalAccessEligibleSort = {
  key: "name",
  dir: "asc",
};

export const PORTAL_ACCESS_ELIGIBLE_PAGE_SIZE = 50;

function comparePortalAccessStrings(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return (left ?? "").localeCompare(right ?? "", "en", { sensitivity: "base" });
}

export function getNextPortalAccessEligibleSortDir(
  currentSort: PortalAccessEligibleSort,
  columnKey: PortalAccessEligibleSortKey,
): PortalAccessEligibleSortDir {
  if (currentSort.key === columnKey) {
    return currentSort.dir === "asc" ? "desc" : "asc";
  }

  return "asc";
}

export function filterPortalAccessEligibleMembers(
  members: PortalAccessMemberSummary[],
  query: string,
): PortalAccessMemberSummary[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return members;
  }

  return members.filter((member) => {
    const name = member.fullName.toLowerCase();
    const email = member.email?.toLowerCase() ?? "";
    const role = member.membershipRoleLabel.toLowerCase();

    return (
      name.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      role.includes(normalizedQuery)
    );
  });
}

export function sortPortalAccessEligibleMembers(
  members: PortalAccessMemberSummary[],
  sort: PortalAccessEligibleSort = DEFAULT_PORTAL_ACCESS_ELIGIBLE_SORT,
): PortalAccessMemberSummary[] {
  const directionMultiplier = sort.dir === "asc" ? 1 : -1;

  return [...members].sort((a, b) => {
    let primaryCompare = 0;

    switch (sort.key) {
      case "name":
        primaryCompare = comparePortalAccessStrings(a.fullName, b.fullName);
        break;
      case "email":
        primaryCompare = comparePortalAccessStrings(a.email, b.email);
        break;
      case "role":
        primaryCompare = comparePortalAccessStrings(
          a.membershipRoleLabel,
          b.membershipRoleLabel,
        );
        break;
      case "last_invite": {
        const aTime = a.lastPortalInviteAt
          ? new Date(a.lastPortalInviteAt).getTime()
          : Number.NEGATIVE_INFINITY;
        const bTime = b.lastPortalInviteAt
          ? new Date(b.lastPortalInviteAt).getTime()
          : Number.NEGATIVE_INFINITY;
        primaryCompare = aTime - bTime;
        break;
      }
    }

    if (primaryCompare !== 0) {
      return primaryCompare * directionMultiplier;
    }

    return comparePortalAccessStrings(a.fullName, b.fullName) * directionMultiplier;
  });
}

export function paginatePortalAccessEligibleMembers<T>(
  members: T[],
  page: number,
  pageSize: number = PORTAL_ACCESS_ELIGIBLE_PAGE_SIZE,
): { pageMembers: T[]; totalPages: number; safePage: number } {
  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    pageMembers: members.slice(start, start + pageSize),
    totalPages,
    safePage,
  };
}

export function formatPortalAccessLastInviteDisplay(
  lastPortalInviteLabel: string | null,
) {
  return lastPortalInviteLabel ?? "Never";
}

export interface PortalAccessBulkSendSummary {
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  failures: Array<{ fullName: string; email: string | null; reason: string }>;
}
