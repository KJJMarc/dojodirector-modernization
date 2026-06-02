export const PORTAL_AUTH_STATUSES = [
  "not_invited",
  "invited",
  "active",
] as const;

export type PortalAuthStatus = (typeof PORTAL_AUTH_STATUSES)[number];

export function formatPortalAuthStatusLabel(status: PortalAuthStatus | string | null) {
  switch (status) {
    case "not_invited":
      return "Not invited";
    case "invited":
      return "Invited";
    case "active":
      return "Active";
    default:
      return "Not invited";
  }
}

export function resolvePortalLoginEmail(
  portalLoginEmail: string | null,
  profileEmail: string | null,
) {
  const loginEmail = portalLoginEmail?.trim() || profileEmail?.trim();
  return loginEmail || null;
}

export function isStudentPortalDevPickerEnabled() {
  return process.env.STUDENT_PORTAL_DEV_PICKER === "true";
}

export const STUDENT_PORTAL_NO_STUDENT_ACCESS_MESSAGE =
  "This account does not have student portal access. The member portal is for students with an active academy membership.";

export const STUDENT_PORTAL_CLUB_ACCESS_DENIED_MESSAGE =
  "You do not have student portal access for this academy. Sign in with a student account or contact the academy for assistance.";
