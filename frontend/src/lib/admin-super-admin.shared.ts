export const LAST_SUPER_ADMIN_BLOCKED_MESSAGE =
  "Cannot remove or demote the last remaining Super Admin. Create another Super Admin account first to prevent lockout.";

export function lastSuperAdminWarningMessage(activeSuperAdminCount: number) {
  if (activeSuperAdminCount > 1) {
    return null;
  }

  return "This is the only Super Admin account in the system. Role changes, deactivation, and deletion are blocked to prevent lockout.";
}
