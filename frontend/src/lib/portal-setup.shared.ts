import {
  loginPathForPasswordResetContext,
  type PasswordResetLoginContext,
} from "@/lib/password-reset.shared";
import { PORTAL_AUTH_EXPIRED_LINK_MESSAGE } from "@/lib/portal-auth-errors.shared";
import { isInstructorPortalMembershipRole } from "@/lib/instructor-portal-auth.shared";
import { isAdminLoginRole, isSuperAdminMembershipRole } from "@/lib/admin-auth.shared";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";

export const PORTAL_SETUP_SUBJECT = "Set up your Dojo Director account";

export const PORTAL_SETUP_SUCCESS_MESSAGE =
  "Your account is ready. You can sign in with your new password.";

export const PORTAL_SETUP_INVALID_LINK_MESSAGE = PORTAL_AUTH_EXPIRED_LINK_MESSAGE;

export type PortalSetupLoginContext = PasswordResetLoginContext;

export function buildPortalSetupResetPath(context: PortalSetupLoginContext) {
  const params = new URLSearchParams({
    setup: "1",
    context,
  });

  return `/reset-password?${params.toString()}`;
}

/** Entry URL for portal setup emails — click-through landing on /setup-password first. */
export function buildPortalSetupConfirmUrl(
  siteOrigin: string,
  hashedToken: string,
  context: PortalSetupLoginContext,
) {
  const nextPath = buildPortalSetupResetPath(context);
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: "recovery",
    next: nextPath,
    setup: "1",
    context,
  });

  return `${siteOrigin.replace(/\/$/, "")}/setup-password?${params.toString()}`;
}

export function loginPathForPortalSetupContext(
  context: PortalSetupLoginContext | null | undefined,
) {
  return loginPathForPasswordResetContext(context);
}

export function isFirstTimePortalSetupSearchParam(
  value: string | null | undefined,
) {
  return value === "1" || value === "true";
}

export function parsePortalSetupLoginContext(
  value: string | undefined,
): PortalSetupLoginContext | null {
  if (
    value === "admin" ||
    value === "super_admin" ||
    value === "instructor" ||
    value === "student"
  ) {
    return value;
  }

  return null;
}

export interface PortalSetupAdminStatusInput {
  profileEmail: string | null;
  portalAuthStatus: string | null;
  portalInvitedAt: string | null;
  instructorPortalAuthStatus: string | null;
  instructorPortalInvitedAt: string | null;
  membershipRole: string | null;
  hasSuperAdminMembership: boolean;
  hasInstructorPortalMembershipAnywhere: boolean;
}

export interface PortalSetupAdminStatus {
  statusLabel: string;
  sentAtLabel: string | null;
  canSendSetupEmail: boolean;
  setupLoginContext: PortalSetupLoginContext;
}

function isPortalAuthActive(status: string | null | undefined) {
  return status === "active";
}

function isPortalSetupSent(status: string | null | undefined, invitedAt: string | null) {
  return status === "invited" || Boolean(invitedAt?.trim());
}

export function resolvePortalSetupLoginContext(input: {
  membershipRole: string | null;
  hasSuperAdminMembership: boolean;
  hasInstructorPortalMembershipAnywhere: boolean;
}): PortalSetupLoginContext {
  if (input.hasSuperAdminMembership || isSuperAdminMembershipRole(input.membershipRole)) {
    return "super_admin";
  }

  if (isAdminLoginRole(input.membershipRole)) {
    return "admin";
  }

  if (
    isInstructorPortalMembershipRole(input.membershipRole) ||
    input.hasInstructorPortalMembershipAnywhere
  ) {
    return "instructor";
  }

  return "student";
}

function formatSetupSentAt(value: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function buildPortalSetupAdminStatus(
  input: PortalSetupAdminStatusInput,
): PortalSetupAdminStatus {
  const hasEmail = Boolean(input.profileEmail?.trim());
  const instructorFacing =
    isInstructorPortalMembershipRole(input.membershipRole) ||
    input.hasInstructorPortalMembershipAnywhere;

  const studentActive = isPortalAuthActive(input.portalAuthStatus);
  const instructorActive =
    !instructorFacing || isPortalAuthActive(input.instructorPortalAuthStatus);

  const fullyActive = studentActive && instructorActive;

  const studentSent = isPortalSetupSent(
    input.portalAuthStatus,
    input.portalInvitedAt,
  );
  const instructorSent =
    instructorFacing &&
    isPortalSetupSent(
      input.instructorPortalAuthStatus,
      input.instructorPortalInvitedAt,
    );

  const setupSent = studentSent || instructorSent;
  const sentAt = input.portalInvitedAt ?? input.instructorPortalInvitedAt ?? null;

  let statusLabel = "Portal setup not sent";

  if (fullyActive) {
    statusLabel = "Portal active";
  } else if (setupSent) {
    statusLabel = "Setup email sent";
  }

  const setupLoginContext = resolvePortalSetupLoginContext({
    membershipRole: input.membershipRole,
    hasSuperAdminMembership: input.hasSuperAdminMembership,
    hasInstructorPortalMembershipAnywhere: input.hasInstructorPortalMembershipAnywhere,
  });

  return {
    statusLabel,
    sentAtLabel: formatSetupSentAt(sentAt),
    canSendSetupEmail: hasEmail && !fullyActive,
    setupLoginContext,
  };
}

/** Active member with a profile email can receive a portal setup email from admin. */
export function canAdminSendPortalSetupEmail(input: {
  profileEmail: string | null;
  membershipStatus: string | null;
}) {
  return (
    Boolean(input.profileEmail?.trim()) &&
    isActiveMembershipStatus(input.membershipStatus)
  );
}
