import {
  isInstructorPortalMembershipRole,
  resolveInstructorPortalLoginEmail,
} from "@/lib/instructor-portal-auth.shared";
import type { PortalAuthStatus } from "@/lib/student-portal-auth.shared";
import {
  formatPortalAuthStatusLabel,
  resolvePortalLoginEmail,
} from "@/lib/student-portal-auth.shared";

export interface MembershipRoleStatusRow {
  role: string | null;
  status: string | null;
}

export function hasActiveInstructorPortalMembershipAnywhere(
  memberships: MembershipRoleStatusRow[],
): boolean {
  return memberships.some(
    (membership) =>
      isInstructorPortalMembershipRole(membership.role) &&
      membership.status === "active",
  );
}

export function resolveInstructorPortalLoginEmailForSync(profile: {
  instructor_portal_login_email: string | null;
  portal_login_email: string | null;
  email: string | null;
}): string | null {
  const loginEmail = resolveInstructorPortalLoginEmail(
    profile.instructor_portal_login_email,
    resolvePortalLoginEmail(profile.portal_login_email, profile.email),
  );

  return loginEmail?.trim().toLowerCase() || null;
}

export type InstructorPortalMembershipSyncAction =
  | { type: "none" }
  | {
      type: "activate";
      instructorPortalLoginEmail?: string;
    }
  | { type: "deactivate" };

function isInstructorPortalAuthActiveOrInvited(status: string | null | undefined) {
  return status === "invited" || status === "active";
}

export function planInstructorPortalMembershipSync(input: {
  memberships: MembershipRoleStatusRow[];
  profile: {
    auth_user_id: string | null;
    instructor_portal_login_email: string | null;
    portal_login_email: string | null;
    email: string | null;
    instructor_portal_auth_status: string | null;
  };
}): InstructorPortalMembershipSyncAction {
  const hasInstructorMembership = hasActiveInstructorPortalMembershipAnywhere(
    input.memberships,
  );

  if (hasInstructorMembership && input.profile.auth_user_id) {
    const loginEmail = resolveInstructorPortalLoginEmailForSync(input.profile);
    const needsLoginEmail = !input.profile.instructor_portal_login_email?.trim();

    return {
      type: "activate",
      ...(needsLoginEmail && loginEmail
        ? { instructorPortalLoginEmail: loginEmail }
        : {}),
    };
  }

  if (
    !hasInstructorMembership &&
    isInstructorPortalAuthActiveOrInvited(input.profile.instructor_portal_auth_status)
  ) {
    return { type: "deactivate" };
  }

  return { type: "none" };
}

export function normalizeInstructorPortalAuthStatus(
  value: string | null | undefined,
): PortalAuthStatus {
  if (value === "invited" || value === "active") {
    return value;
  }

  return "not_invited";
}

export function instructorPortalLoginCanSignIn(status: PortalAuthStatus) {
  return status === "active" || status === "invited";
}

export function formatInstructorPortalAdminLoginLabel(input: {
  portalAuthStatus: PortalAuthStatus;
  hasAuthLogin: boolean;
  hasInstructorRoleAtAcademy: boolean;
}): string {
  const statusLabel = formatPortalAuthStatusLabel(input.portalAuthStatus);

  if (instructorPortalLoginCanSignIn(input.portalAuthStatus)) {
    return statusLabel;
  }

  if (!input.hasInstructorRoleAtAcademy) {
    return "—";
  }

  if (input.hasAuthLogin) {
    return "Not active — save role again or set password in Login Access";
  }

  return "Not set up — set password or send instructor invite";
}

export function formatMembershipInstructorRoleLabel(
  role: string | null | undefined,
): string {
  if (!role) {
    return "—";
  }

  if (role === "super_admin") {
    return "Super admin";
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "instructor") {
    return "Instructor";
  }

  return role;
}
