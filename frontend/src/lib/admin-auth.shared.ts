export const PLATFORM_SUPER_ADMIN_ROLE = "super_admin" as const;

export const CLUB_ADMIN_MEMBERSHIP_ROLES = ["admin", "owner"] as const;

export const ADMIN_LOGIN_ROLES = [
  PLATFORM_SUPER_ADMIN_ROLE,
  ...CLUB_ADMIN_MEMBERSHIP_ROLES,
] as const;

export type AdminLoginRole = (typeof ADMIN_LOGIN_ROLES)[number];

export type ClubAdminMembershipRole = (typeof CLUB_ADMIN_MEMBERSHIP_ROLES)[number];

export function normalizeMembershipRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() ?? null;
}

export function isSuperAdminMembershipRole(role: string | null | undefined) {
  return normalizeMembershipRole(role) === PLATFORM_SUPER_ADMIN_ROLE;
}

export function isClubAdminMembershipRole(
  role: string | null | undefined,
): role is ClubAdminMembershipRole {
  const normalized = normalizeMembershipRole(role);

  if (!normalized) {
    return false;
  }

  return (CLUB_ADMIN_MEMBERSHIP_ROLES as readonly string[]).includes(normalized);
}

export function isAdminLoginRole(
  role: string | null | undefined,
): role is AdminLoginRole {
  const normalized = normalizeMembershipRole(role);

  if (!normalized) {
    return false;
  }

  return (ADMIN_LOGIN_ROLES as readonly string[]).includes(normalized);
}

/** Show admin dashboard access UI on profile (password setup), including owner/admin. */
export function membershipGrantsAdminDashboardPanel(
  role: string | null | undefined,
  status: string | null | undefined,
) {
  if (!isAdminLoginRole(role)) {
    return false;
  }

  const normalizedStatus = status?.trim().toLowerCase();

  if (normalizedStatus === "archived") {
    return false;
  }

  return true;
}

/** @deprecated Use isAdminLoginRole or role-specific helpers */
export function isAdminMembershipRole(
  role: string | null | undefined,
): role is AdminLoginRole {
  return isAdminLoginRole(role);
}

export function adminAccessPath(clubSlug: string) {
  const normalized = clubSlug.trim().replace(/^\/+|\/+$/g, "");
  return `/admin-access/${normalized}`;
}

export function adminLoginPath() {
  return "/admin/login";
}

export function adminAcademySelectPath() {
  return "/admin/select";
}

/** Platform super admin sign-in URL. */
export function superAdminLoginPath() {
  return "/super-admin/login";
}

export const SUPER_ADMIN_LOGIN_PATH = superAdminLoginPath();

export const ADMIN_ACCESS_DENIED_MESSAGE =
  "You do not have permission to access the admin area.";

export const SUPER_ADMIN_PATH = "/super-admin";

export type AdminLoginIntent = "super_admin" | "academy_admin" | "legacy_club";
