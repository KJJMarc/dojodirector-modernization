import {
  formatPortalAuthStatusLabel,
  resolvePortalLoginEmail,
  type PortalAuthStatus,
} from "@/lib/student-portal-auth.shared";

export { formatPortalAuthStatusLabel, type PortalAuthStatus };

export function resolveInstructorPortalLoginEmail(
  instructorPortalLoginEmail: string | null,
  profileEmail: string | null,
) {
  return resolvePortalLoginEmail(instructorPortalLoginEmail, profileEmail);
}

export function isInstructorPortalMembershipRole(role: string | null | undefined) {
  return role === "instructor" || role === "admin" || role === "super_admin";
}

export function canAccessInstructorPortalAuthStatus(status: PortalAuthStatus) {
  return status === "active" || status === "invited";
}
