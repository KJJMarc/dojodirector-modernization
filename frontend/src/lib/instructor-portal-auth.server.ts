import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  canAccessInstructorPortalAuthStatus,
  isInstructorPortalMembershipRole,
  resolveInstructorPortalLoginEmail,
  type PortalAuthStatus,
} from "@/lib/instructor-portal-auth.shared";
import { loadInstructorPortalAccessibleClubs } from "@/lib/instructor-portal-club.server";
import {
  getSupabaseAuthSessionUser,
  validatePortalPasswordInput,
} from "@/lib/student-portal-auth.server";
import { formatPortalAuthStatusLabel } from "@/lib/student-portal-auth.shared";
import {
  ensureAuthUserForPortalLogin,
  linkProfileAfterPortalPasswordSet,
} from "@/lib/portal-auth-user.server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface InstructorPortalUser {
  id: string;
  authUserId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  instructorPortalLoginEmail: string | null;
  instructorPortalAuthStatus: PortalAuthStatus;
  instructorPortalInvitedAt: string | null;
}

export interface InstructorPortalAuthProfile {
  userId: string;
  authUserId: string;
  fullName: string;
  email: string | null;
  instructorPortalLoginEmail: string | null;
  instructorPortalAuthStatus: PortalAuthStatus;
}

export interface AdminInstructorPortalAuthSummary {
  portalAuthStatus: PortalAuthStatus;
  portalAuthStatusLabel: string;
  portalLoginEmail: string | null;
  authUserId: string | null;
  portalInvitedAt: string | null;
  canSendInvite: boolean;
  canSetPassword: boolean;
}

interface UserInstructorPortalAuthRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  auth_user_id: string | null;
  instructor_portal_auth_status: string | null;
  instructor_portal_invited_at: string | null;
  instructor_portal_login_email: string | null;
}

const USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS =
  "id, first_name, last_name, email, auth_user_id, instructor_portal_auth_status, instructor_portal_invited_at, instructor_portal_login_email";

function normalizePortalAuthStatus(value: string | null): PortalAuthStatus {
  if (value === "invited" || value === "active") {
    return value;
  }

  return "not_invited";
}

function mapInstructorPortalUser(row: UserInstructorPortalAuthRow): InstructorPortalUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: getStudentFullName(row.first_name, row.last_name),
    email: row.email,
    instructorPortalLoginEmail: resolveInstructorPortalLoginEmail(
      row.instructor_portal_login_email,
      row.email,
    ),
    instructorPortalAuthStatus: normalizePortalAuthStatus(
      row.instructor_portal_auth_status,
    ),
    instructorPortalInvitedAt: row.instructor_portal_invited_at,
  };
}

function mapInstructorPortalAuthProfile(
  row: UserInstructorPortalAuthRow,
): InstructorPortalAuthProfile {
  if (!row.auth_user_id) {
    throw new Error("Instructor profile is not linked to a portal login.");
  }

  return {
    userId: row.id,
    authUserId: row.auth_user_id,
    fullName: getStudentFullName(row.first_name, row.last_name),
    email: row.email,
    instructorPortalLoginEmail: row.instructor_portal_login_email,
    instructorPortalAuthStatus: normalizePortalAuthStatus(
      row.instructor_portal_auth_status,
    ),
  };
}

export async function userHasInstructorPortalMembership(
  userId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load instructor membership: ${error.message}`);
  }

  return isInstructorPortalMembershipRole(data?.role ?? null);
}

export async function getInstructorPortalUserByStudentId(
  userId: string,
): Promise<InstructorPortalUser | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load instructor portal user: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapInstructorPortalUser(data as UserInstructorPortalAuthRow);
}

async function loadUserByAuthUserId(authUserId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user by auth id: ${error.message}`);
  }

  return data as UserInstructorPortalAuthRow | null;
}

async function loadUserByInstructorLoginEmail(email: string) {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = email.trim();

  const { data: byPortalEmail, error: portalEmailError } = await supabase
    .from("users")
    .select(USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS)
    .ilike("instructor_portal_login_email", normalizedEmail)
    .maybeSingle();

  if (portalEmailError) {
    throw new Error(
      `Failed to load user by instructor portal email: ${portalEmailError.message}`,
    );
  }

  if (byPortalEmail) {
    return byPortalEmail as UserInstructorPortalAuthRow;
  }

  const { data: byProfileEmail, error: profileEmailError } = await supabase
    .from("users")
    .select(USER_INSTRUCTOR_PORTAL_AUTH_COLUMNS)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profileEmailError) {
    throw new Error(`Failed to load user by email: ${profileEmailError.message}`);
  }

  return byProfileEmail as UserInstructorPortalAuthRow | null;
}

export async function linkAuthUserToInstructor(userId: string, authUserId: string) {
  const portalUser = await getInstructorPortalUserByStudentId(userId);
  const supabase = getSupabaseAdminClient();
  const update: Record<string, unknown> = { auth_user_id: authUserId };

  if (portalUser?.instructorPortalAuthStatus === "invited") {
    update.instructor_portal_auth_status = "active";
  }

  const { error } = await supabase.from("users").update(update).eq("id", userId);

  if (error) {
    throw new Error(`Failed to link auth user to instructor: ${error.message}`);
  }
}

async function resolveProfileForInstructorAuthUser(
  authUser: NonNullable<Awaited<ReturnType<typeof getSupabaseAuthSessionUser>>>,
): Promise<InstructorPortalAuthProfile | null> {
  let row = await loadUserByAuthUserId(authUser.id);

  if (!row && authUser.email) {
    row = await loadUserByInstructorLoginEmail(authUser.email);

    if (row) {
      await linkAuthUserToInstructor(row.id, authUser.id);
      row = await loadUserByAuthUserId(authUser.id);
    }
  }

  if (!row) {
    return null;
  }

  if (!row.auth_user_id) {
    await linkAuthUserToInstructor(row.id, authUser.id);
    row = await loadUserByAuthUserId(authUser.id);
  }

  if (!row?.auth_user_id) {
    return null;
  }

  const hasMembership = (await loadInstructorPortalAccessibleClubs(row.id)).length > 0;

  if (!hasMembership) {
    return null;
  }

  const portalStatus = normalizePortalAuthStatus(row.instructor_portal_auth_status);

  if (!canAccessInstructorPortalAuthStatus(portalStatus)) {
    return null;
  }

  return mapInstructorPortalAuthProfile(row);
}

export type InstructorPortalSessionState =
  | { status: "signed_out" }
  | { status: "unlinked" }
  | { status: "authenticated"; profile: InstructorPortalAuthProfile };

export async function resolveInstructorPortalSessionState(): Promise<InstructorPortalSessionState> {
  const authUser = await getSupabaseAuthSessionUser();

  if (!authUser) {
    return { status: "signed_out" };
  }

  const profile = await resolveProfileForInstructorAuthUser(authUser);

  if (!profile) {
    return { status: "unlinked" };
  }

  return { status: "authenticated", profile };
}

export async function getAuthenticatedInstructorPortalProfile(): Promise<InstructorPortalAuthProfile | null> {
  const session = await resolveInstructorPortalSessionState();

  if (session.status !== "authenticated") {
    return null;
  }

  return session.profile;
}

export async function getAdminInstructorPortalAuthSummary(
  userId: string,
): Promise<AdminInstructorPortalAuthSummary> {
  const portalUser = await getInstructorPortalUserByStudentId(userId);

  if (!portalUser) {
    throw new Error("Instructor not found.");
  }

  const portalAuthStatus = portalUser.instructorPortalAuthStatus;

  return {
    portalAuthStatus,
    portalAuthStatusLabel: formatPortalAuthStatusLabel(portalAuthStatus),
    portalLoginEmail: portalUser.instructorPortalLoginEmail,
    authUserId: portalUser.authUserId,
    portalInvitedAt: portalUser.instructorPortalInvitedAt,
    canSendInvite:
      Boolean(portalUser.instructorPortalLoginEmail) &&
      portalAuthStatus !== "active",
    canSetPassword: Boolean(portalUser.instructorPortalLoginEmail),
  };
}

export async function updateInstructorPortalLoginEmail(input: {
  userId: string;
  loginEmail: string;
}) {
  const loginEmail = input.loginEmail.trim().toLowerCase();

  if (!loginEmail || !loginEmail.includes("@")) {
    throw new Error("Please enter a valid login email address.");
  }

  const portalUser = await getInstructorPortalUserByStudentId(input.userId);

  if (!portalUser) {
    throw new Error("Instructor not found.");
  }

  const supabase = getSupabaseAdminClient();
  const { error: updateError } = await supabase
    .from("users")
    .update({ instructor_portal_login_email: loginEmail })
    .eq("id", input.userId);

  if (updateError) {
    throw new Error(`Failed to update instructor login email: ${updateError.message}`);
  }

  if (portalUser.authUserId) {
    const { error: authError } = await supabase.auth.admin.updateUserById(
      portalUser.authUserId,
      { email: loginEmail },
    );

    if (authError) {
      throw new Error(`Failed to update auth login email: ${authError.message}`);
    }
  }

  return { loginEmail };
}

export async function setInstructorPortalPassword(input: {
  userId: string;
  password: string;
  confirmPassword: string;
}) {
  validatePortalPasswordInput(input.password, input.confirmPassword);

  const portalUser = await getInstructorPortalUserByStudentId(input.userId);

  if (!portalUser) {
    throw new Error("Instructor not found.");
  }

  const loginEmail = portalUser.instructorPortalLoginEmail;

  if (!loginEmail) {
    throw new Error("Add a login email before setting a portal password.");
  }

  const authUserId = await ensureAuthUserForPortalLogin({
    loginEmail,
    password: input.password,
    existingAuthUserId: portalUser.authUserId,
    profileUserId: input.userId,
  });

  const preservedLoginEmail =
    portalUser.instructorPortalLoginEmail?.trim() || loginEmail;

  await linkProfileAfterPortalPasswordSet({
    userId: input.userId,
    authUserId,
    loginEmail: preservedLoginEmail,
  });

  const supabase = getSupabaseAdminClient();
  const { error: updateError } = await supabase
    .from("users")
    .update({
      instructor_portal_login_email: preservedLoginEmail,
      instructor_portal_auth_status: "active",
    })
    .eq("id", input.userId);

  if (updateError) {
    throw new Error(
      `Failed to update instructor portal access: ${updateError.message}`,
    );
  }

  return { authUserId, loginEmail: preservedLoginEmail };
}

export async function sendInstructorPortalInvite(input: {
  userId: string;
  clubId: string;
  redirectTo?: string;
}) {
  const hasMembership = await userHasInstructorPortalMembership(
    input.userId,
    input.clubId,
  );

  if (!hasMembership) {
    throw new Error("This member must have an instructor or admin role.");
  }

  const supabase = getSupabaseAdminClient();
  const portalUser = await getInstructorPortalUserByStudentId(input.userId);

  if (!portalUser) {
    throw new Error("Instructor not found.");
  }

  const loginEmail = portalUser.instructorPortalLoginEmail;

  if (!loginEmail) {
    throw new Error("Add a login email before sending an instructor portal invite.");
  }

  const now = new Date().toISOString();
  let authUserId = portalUser.authUserId;

  if (!authUserId) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const redirectTo = input.redirectTo ?? `${siteUrl}/instructor-portal`;

    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(loginEmail, {
        redirectTo,
      });

    if (inviteError) {
      throw new Error(`Failed to send instructor portal invite: ${inviteError.message}`);
    }

    authUserId = inviteData.user?.id ?? null;
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      instructor_portal_login_email: loginEmail,
      instructor_portal_auth_status: "invited",
      instructor_portal_invited_at: now,
      ...(authUserId ? { auth_user_id: authUserId } : {}),
    })
    .eq("id", input.userId);

  if (updateError) {
    throw new Error(
      `Failed to update instructor portal invite status: ${updateError.message}`,
    );
  }

  return { loginEmail, authUserId };
}

function isMissingAuthSessionError(error: { message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("auth session missing") ||
    message.includes("session missing") ||
    (message.includes("jwt") && message.includes("does not exist"))
  );
}

export async function markInstructorPortalActive(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ instructor_portal_auth_status: "active" })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to activate instructor portal access: ${error.message}`);
  }
}

export async function signOutInstructorPortal() {
  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.signOut();

  if (error && !isMissingAuthSessionError(error)) {
    throw new Error(`Failed to sign out: ${error.message}`);
  }
}
