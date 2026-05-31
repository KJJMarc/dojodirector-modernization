import "server-only";

import { isInstructorPortalMembershipRole } from "@/lib/instructor-portal-auth.shared";
import {
  ensureAuthUserForPortalLogin,
  linkProfileAfterPortalPasswordSet,
  loadPortalAuthLinkProfile,
  resolveProfilePortalLoginEmail,
} from "@/lib/portal-auth-user.server";
import {
  formatPortalAuthStatusLabel,
  type PortalAuthStatus,
} from "@/lib/student-portal-auth.shared";
import { validatePortalPasswordInput } from "@/lib/student-portal-auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import type { ProfileLoginAccessSummary } from "@/lib/admin-student-profile.shared";

function normalizePortalAuthStatus(value: string | null): PortalAuthStatus {
  if (value === "invited" || value === "active") {
    return value;
  }

  return "not_invited";
}

function buildLoginStatusLabel(
  portalAuthStatus: PortalAuthStatus,
  hasAuthLogin: boolean,
) {
  if (portalAuthStatus === "active") {
    return "Active";
  }

  if (portalAuthStatus === "invited") {
    return "Invited";
  }

  if (hasAuthLogin) {
    return "Linked";
  }

  return "Not active";
}

export async function getProfileLoginAccessSummary(
  userId: string,
): Promise<ProfileLoginAccessSummary> {
  const profile = await loadPortalAuthLinkProfile(userId);

  if (!profile) {
    throw new Error("User not found.");
  }

  const loginEmail = resolveProfilePortalLoginEmail(profile)?.trim() || null;
  const hasAuthLogin = Boolean(profile.auth_user_id);
  const portalAuthStatus = normalizePortalAuthStatus(profile.portal_auth_status);

  return {
    loginEmail,
    canSetPassword: Boolean(loginEmail),
    hasAuthLogin,
    loginStatusLabel: buildLoginStatusLabel(portalAuthStatus, hasAuthLogin),
    authLinkedLabel: hasAuthLogin ? "Yes" : "No",
    portalAuthStatusLabel: formatPortalAuthStatusLabel(portalAuthStatus),
  };
}

export async function setProfileLoginPassword(input: {
  userId: string;
  password: string;
  confirmPassword: string;
  membershipRole?: string | null;
}) {
  validatePortalPasswordInput(input.password, input.confirmPassword);

  const profile = await loadPortalAuthLinkProfile(input.userId);

  if (!profile) {
    throw new Error("User not found.");
  }

  const loginEmail = resolveProfilePortalLoginEmail(profile)?.trim();

  if (!loginEmail) {
    throw new Error("Add a profile or portal login email before setting a password.");
  }

  const hadAuthLogin = Boolean(profile.auth_user_id);

  const authUserId = await ensureAuthUserForPortalLogin({
    loginEmail,
    password: input.password,
    existingAuthUserId: profile.auth_user_id,
    profileUserId: profile.id,
  });

  await linkProfileAfterPortalPasswordSet({
    userId: profile.id,
    authUserId,
    loginEmail,
  });

  if (isInstructorPortalMembershipRole(input.membershipRole)) {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("users")
      .update({ instructor_portal_auth_status: "active" })
      .eq("id", input.userId);

    if (error) {
      throw new Error(
        `Failed to update instructor portal access: ${error.message}`,
      );
    }
  }

  return { authUserId, loginEmail, hadAuthLogin };
}
