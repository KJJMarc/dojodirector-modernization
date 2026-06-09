import "server-only";

import { isSuperAdminMembershipRole } from "@/lib/admin-auth.shared";
import { isInstructorPortalMembershipRole } from "@/lib/instructor-portal-auth.shared";
import { hasActiveInstructorPortalMembershipAnywhere } from "@/lib/instructor-portal-membership-sync.shared";
import { syncInstructorPortalAccessAfterMembershipChange } from "@/lib/instructor-portal-membership-sync.server";
import {
  assertAuthUserAvailableForProfile,
  ensureAuthUserForPortalSetup,
  findAuthUserIdByEmail,
  linkProfileAfterPortalPasswordSet,
  resolveProfilePortalLoginEmail,
} from "@/lib/portal-auth-user.server";
import { sendPortalSetupEmail } from "@/lib/portal-setup-email.server";
import {
  buildPortalSetupAdminStatus,
  buildPortalSetupConfirmUrl,
  buildPortalSetupResetPath,
  canAdminSendPortalSetupEmail,
  resolvePortalSetupLoginContext,
  type PortalSetupAdminStatus,
  type PortalSetupLoginContext,
} from "@/lib/portal-setup.shared";
import { resolveSiteOrigin } from "@/lib/site-origin.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PORTAL_SETUP_USER_COLUMNS =
  "id, email, auth_user_id, portal_login_email, portal_auth_status, portal_invited_at, instructor_portal_login_email, instructor_portal_auth_status, instructor_portal_invited_at";

interface PortalSetupUserRow {
  id: string;
  email: string | null;
  auth_user_id: string | null;
  portal_login_email: string | null;
  portal_auth_status: string | null;
  portal_invited_at: string | null;
  instructor_portal_login_email: string | null;
  instructor_portal_auth_status: string | null;
  instructor_portal_invited_at: string | null;
}

interface MembershipRoleStatusRow {
  role: string | null;
  status: string | null;
}

function logPortalSetupFailure(message: string) {
  console.error("[portal-setup]", { message });
}

async function loadPortalSetupUser(userId: string): Promise<PortalSetupUserRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(PORTAL_SETUP_USER_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load member: ${error.message}`);
  }

  return (data as PortalSetupUserRow | null) ?? null;
}

async function loadAllMembershipsForUser(userId: string): Promise<MembershipRoleStatusRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load memberships: ${error.message}`);
  }

  return (data ?? []) as MembershipRoleStatusRow[];
}

async function resolveAuthEmailForSetup(
  loginEmail: string,
  profile: PortalSetupUserRow,
): Promise<string> {
  const authUserId =
    profile.auth_user_id ?? (await findAuthUserIdByEmail(loginEmail));

  if (!authUserId) {
    throw new Error("Unable to prepare portal login for this member.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(authUserId);

  if (error) {
    throw new Error(`Failed to load auth user: ${error.message}`);
  }

  const authEmail = data.user?.email?.trim().toLowerCase();

  if (!authEmail) {
    throw new Error("Unable to prepare portal login for this member.");
  }

  return authEmail;
}

export async function getPortalSetupAdminStatusForMember(input: {
  userId: string;
  profileEmail: string | null;
  membershipRole: string | null;
  membershipStatus: string | null;
}): Promise<PortalSetupAdminStatus & { canSendSetupEmail: boolean }> {
  const [profile, memberships] = await Promise.all([
    loadPortalSetupUser(input.userId),
    loadAllMembershipsForUser(input.userId),
  ]);

  if (!profile) {
    throw new Error("Member not found.");
  }

  const hasSuperAdminMembership = memberships.some((row) =>
    isSuperAdminMembershipRole(row.role),
  );
  const hasInstructorPortalMembershipAnywhere =
    hasActiveInstructorPortalMembershipAnywhere(memberships);

  const status = buildPortalSetupAdminStatus({
    profileEmail: input.profileEmail,
    portalAuthStatus: profile.portal_auth_status,
    portalInvitedAt: profile.portal_invited_at,
    instructorPortalAuthStatus: profile.instructor_portal_auth_status,
    instructorPortalInvitedAt: profile.instructor_portal_invited_at,
    membershipRole: input.membershipRole,
    hasSuperAdminMembership,
    hasInstructorPortalMembershipAnywhere,
  });

  const canSend = canAdminSendPortalSetupEmail({
    profileEmail: input.profileEmail,
    membershipStatus: input.membershipStatus,
  });

  return {
    ...status,
    canSendSetupEmail: canSend && status.canSendSetupEmail,
  };
}

export async function sendPortalSetupEmailForMember(input: {
  userId: string;
  clubSlug: string;
  academyName: string;
  membershipRole: string | null;
  membershipStatus: string | null;
  profileEmail: string | null;
}): Promise<{ message: string; loginEmail: string }> {
  if (
    !canAdminSendPortalSetupEmail({
      profileEmail: input.profileEmail,
      membershipStatus: input.membershipStatus,
    })
  ) {
    throw new Error("Add a profile email before sending a portal setup email.");
  }

  const profile = await loadPortalSetupUser(input.userId);

  if (!profile) {
    throw new Error("Member not found.");
  }

  const loginEmail =
    resolveProfilePortalLoginEmail(profile)?.trim().toLowerCase() ||
    input.profileEmail?.trim().toLowerCase();

  if (!loginEmail || !loginEmail.includes("@")) {
    throw new Error("Add a valid profile email before sending a portal setup email.");
  }

  const memberships = await loadAllMembershipsForUser(input.userId);
  const hasSuperAdminMembership = memberships.some((row) =>
    isSuperAdminMembershipRole(row.role),
  );
  const hasInstructorPortalMembershipAnywhere =
    hasActiveInstructorPortalMembershipAnywhere(memberships);
  const instructorFacing =
    isInstructorPortalMembershipRole(input.membershipRole) ||
    hasInstructorPortalMembershipAnywhere;

  const setupContext = resolvePortalSetupLoginContext({
    membershipRole: input.membershipRole,
    hasSuperAdminMembership,
    hasInstructorPortalMembershipAnywhere,
  });

  const authUserId = await ensureAuthUserForPortalSetup({
    loginEmail,
    existingAuthUserId: profile.auth_user_id,
    profileUserId: profile.id,
  });

  await assertAuthUserAvailableForProfile(authUserId, profile.id);

  const authEmail = await resolveAuthEmailForSetup(loginEmail, {
    ...profile,
    auth_user_id: authUserId,
  });

  const supabase = getSupabaseAdminClient();
  const siteOrigin = resolveSiteOrigin();
  const setupLinkNextPath = buildPortalSetupResetPath(setupContext);

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: authEmail,
    options: {
      redirectTo: `${siteOrigin}${setupLinkNextPath}`,
    },
  });

  if (linkError) {
    logPortalSetupFailure(linkError.message);
    throw new Error("Unable to send portal setup email. Please try again.");
  }

  const hashedToken = linkData.properties?.hashed_token?.trim();

  if (!hashedToken) {
    logPortalSetupFailure("Setup token was not generated.");
    throw new Error("Unable to send portal setup email. Please try again.");
  }

  const setupLink = buildPortalSetupConfirmUrl(siteOrigin, hashedToken, setupContext);

  await sendPortalSetupEmail({
    clubSlug: input.clubSlug,
    academyName: input.academyName,
    to: authEmail,
    setupLink,
  });

  const now = new Date().toISOString();
  const userUpdate: Record<string, string> = {
    auth_user_id: authUserId,
    portal_auth_status: "invited",
    portal_invited_at: now,
  };

  if (!profile.portal_login_email?.trim()) {
    userUpdate.portal_login_email = loginEmail;
  }

  if (instructorFacing) {
    userUpdate.instructor_portal_auth_status = "invited";
    userUpdate.instructor_portal_invited_at = now;

    if (!profile.instructor_portal_login_email?.trim()) {
      userUpdate.instructor_portal_login_email = loginEmail;
    }
  }

  const { error: profileUpdateError } = await supabase
    .from("users")
    .update(userUpdate)
    .eq("id", input.userId);

  if (profileUpdateError) {
    logPortalSetupFailure(profileUpdateError.message);
    throw new Error(
      "Portal setup email was sent, but invite status could not be saved. Please contact support.",
    );
  }

  return {
    message: "Portal setup email sent.",
    loginEmail: authEmail,
  };
}

export async function completePortalSetupAfterPassword(input: {
  authUserId: string;
  loginEmail: string;
  context: PortalSetupLoginContext | null;
}) {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = input.loginEmail.trim().toLowerCase();

  let { data: profile, error } = await supabase
    .from("users")
    .select(PORTAL_SETUP_USER_COLUMNS)
    .eq("auth_user_id", input.authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load member after setup: ${error.message}`);
  }

  if (!profile) {
    const { data: byPortalEmail, error: portalEmailError } = await supabase
      .from("users")
      .select(PORTAL_SETUP_USER_COLUMNS)
      .ilike("portal_login_email", normalizedEmail)
      .maybeSingle();

    if (portalEmailError) {
      throw new Error(`Failed to load member after setup: ${portalEmailError.message}`);
    }

    profile = byPortalEmail;

    if (!profile) {
      const { data: byEmail, error: emailError } = await supabase
        .from("users")
        .select(PORTAL_SETUP_USER_COLUMNS)
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (emailError) {
        throw new Error(`Failed to load member after setup: ${emailError.message}`);
      }

      profile = byEmail;
    }
  }

  if (!profile) {
    throw new Error("Member profile not found for this login.");
  }

  const row = profile as PortalSetupUserRow;

  await linkProfileAfterPortalPasswordSet({
    userId: row.id,
    authUserId: input.authUserId,
    loginEmail: normalizedEmail,
  });

  await syncInstructorPortalAccessAfterMembershipChange(row.id);

  const memberships = await loadAllMembershipsForUser(row.id);
  const instructorFacing = hasActiveInstructorPortalMembershipAnywhere(memberships);

  if (instructorFacing) {
    const instructorLoginEmail =
      row.instructor_portal_login_email?.trim().toLowerCase() || normalizedEmail;
    const instructorUpdate: Record<string, string> = {
      instructor_portal_auth_status: "active",
    };

    if (!row.instructor_portal_login_email?.trim()) {
      instructorUpdate.instructor_portal_login_email = instructorLoginEmail;
    }

    const { error: instructorError } = await supabase
      .from("users")
      .update(instructorUpdate)
      .eq("id", row.id);

    if (instructorError) {
      throw new Error(
        `Failed to activate instructor portal access: ${instructorError.message}`,
      );
    }
  }
}
