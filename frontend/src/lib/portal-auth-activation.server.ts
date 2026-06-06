import "server-only";

import { linkAuthUserToInstructor } from "@/lib/instructor-portal-auth.server";
import {
  hasActiveInstructorPortalMembershipAnywhere,
  type MembershipRoleStatusRow,
} from "@/lib/instructor-portal-membership-sync.shared";
import { syncInstructorPortalAccessAfterMembershipChange } from "@/lib/instructor-portal-membership-sync.server";
import { planPortalAuthSignInActivation } from "@/lib/portal-auth-activation.shared";
import {
  linkProfileAfterPortalPasswordSet,
  resolveProfilePortalLoginEmail,
} from "@/lib/portal-auth-user.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PORTAL_SIGN_IN_ACTIVATION_COLUMNS =
  "id, email, auth_user_id, portal_login_email, portal_auth_status, instructor_portal_login_email, instructor_portal_auth_status";

interface PortalSignInActivationProfile {
  id: string;
  email: string | null;
  auth_user_id: string | null;
  portal_login_email: string | null;
  portal_auth_status: string | null;
  instructor_portal_login_email: string | null;
  instructor_portal_auth_status: string | null;
}

async function loadMembershipsForUser(userId: string): Promise<MembershipRoleStatusRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load memberships for portal activation: ${error.message}`);
  }

  return (data ?? []) as MembershipRoleStatusRow[];
}

async function loadProfileForSignInActivation(input: {
  authUserId: string;
  email: string;
}): Promise<PortalSignInActivationProfile | null> {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = input.email.trim().toLowerCase();

  const { data: byAuthUserId, error: byAuthError } = await supabase
    .from("users")
    .select(PORTAL_SIGN_IN_ACTIVATION_COLUMNS)
    .eq("auth_user_id", input.authUserId)
    .maybeSingle();

  if (byAuthError) {
    throw new Error(`Failed to load member for portal activation: ${byAuthError.message}`);
  }

  if (byAuthUserId) {
    return byAuthUserId as PortalSignInActivationProfile;
  }

  const emailLookups = [
    { column: "portal_login_email", value: normalizedEmail },
    { column: "instructor_portal_login_email", value: normalizedEmail },
    { column: "email", value: normalizedEmail },
  ] as const;

  for (const lookup of emailLookups) {
    const { data, error } = await supabase
      .from("users")
      .select(PORTAL_SIGN_IN_ACTIVATION_COLUMNS)
      .ilike(lookup.column, lookup.value)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load member for portal activation: ${error.message}`);
    }

    if (data) {
      return data as PortalSignInActivationProfile;
    }
  }

  return null;
}

/**
 * After a successful password sign-in, promote invited portal flags to active.
 * Reuses existing link/sync helpers; does not change memberships or assignments.
 */
export async function promoteInvitedPortalAccessAfterPasswordSignIn(input: {
  authUserId: string;
  email: string;
}): Promise<void> {
  const authUserId = input.authUserId.trim();
  const email = input.email.trim();

  if (!authUserId || !email) {
    return;
  }

  const profile = await loadProfileForSignInActivation({ authUserId, email });

  if (!profile) {
    return;
  }

  const plan = planPortalAuthSignInActivation({
    portalAuthStatus: profile.portal_auth_status,
    instructorPortalAuthStatus: profile.instructor_portal_auth_status,
    authUserId: profile.auth_user_id ?? authUserId,
  });

  const loginEmail =
    resolveProfilePortalLoginEmail(profile)?.trim().toLowerCase() ||
    email.toLowerCase();

  if (plan.promoteStudentPortal) {
    await linkProfileAfterPortalPasswordSet({
      userId: profile.id,
      authUserId,
      loginEmail,
    });
  }

  if (plan.promoteInstructorPortal) {
    const memberships = await loadMembershipsForUser(profile.id);

    if (hasActiveInstructorPortalMembershipAnywhere(memberships)) {
      await linkAuthUserToInstructor(profile.id, authUserId);
      await syncInstructorPortalAccessAfterMembershipChange(profile.id);
    }
  }
}
