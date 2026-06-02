/** Dedicated platform Super Admin login (super_admin memberships only). */
export const PRIMARY_SUPER_ADMIN_USER_ID = "e7c3a912-5d4b-4f81-9c2e-0a8b6d1f3e45";

export const LAST_SUPER_ADMIN_BLOCKED_MESSAGE =
  "Cannot remove or demote the last remaining Super Admin. Create another Super Admin account first to prevent lockout.";

export function lastSuperAdminWarningMessage(activeSuperAdminCount: number) {
  if (activeSuperAdminCount > 1) {
    return null;
  }

  return "This is the only Super Admin account in the system. Role changes, deactivation, and deletion are blocked to prevent lockout.";
}
