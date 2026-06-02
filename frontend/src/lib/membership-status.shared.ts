export const MEMBERSHIP_STATUS_ACTIVE = "active";
export const MEMBERSHIP_STATUS_PAUSED = "paused";
export const MEMBERSHIP_STATUS_INACTIVE = "inactive";

/** Legacy value retained for reads until migration completes everywhere. */
export const MEMBERSHIP_STATUS_SUSPENDED_LEGACY = "suspended";

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  inactive: "Inactive",
  suspended: "Paused",
  trial: "Trial",
  archived: "Archived",
};

export const STUDENT_PORTAL_INACTIVE_MEMBERSHIP_MESSAGE =
  "Your membership is not currently active. Please contact the academy for assistance.";

export function normalizeMembershipStatusValue(
  status: string | null | undefined,
): string | null {
  if (!status) {
    return null;
  }

  const normalized = status.trim().toLowerCase();

  if (normalized === MEMBERSHIP_STATUS_SUSPENDED_LEGACY) {
    return MEMBERSHIP_STATUS_PAUSED;
  }

  return normalized;
}

export function isActiveMembershipStatus(status: string | null | undefined): boolean {
  return normalizeMembershipStatusValue(status) === MEMBERSHIP_STATUS_ACTIVE;
}

export function isPausedMembershipStatus(status: string | null | undefined): boolean {
  return normalizeMembershipStatusValue(status) === MEMBERSHIP_STATUS_PAUSED;
}

export function isInactiveMembershipStatus(status: string | null | undefined): boolean {
  const normalized = normalizeMembershipStatusValue(status);

  return (
    normalized === MEMBERSHIP_STATUS_INACTIVE ||
    normalized === "expired" ||
    normalized === "archived"
  );
}

export function isNonActiveMembershipStatus(status: string | null | undefined): boolean {
  return !isActiveMembershipStatus(status);
}

export function formatMembershipStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return "—";
  }

  const normalized = normalizeMembershipStatusValue(status);

  if (normalized && MEMBERSHIP_STATUS_LABELS[normalized]) {
    return MEMBERSHIP_STATUS_LABELS[normalized];
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}
