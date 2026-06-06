import "server-only";

import { cache } from "react";
import { getStudentFullName } from "@/lib/attendance";
import { resolveStudentPortalStudentMembershipAccess } from "@/lib/student-portal-club.server";
import {
  formatPortalAuthStatusLabel,
  resolvePortalLoginEmail,
  type PortalAuthStatus,
} from "@/lib/student-portal-auth.shared";
import {
  ensureAuthUserForPortalLogin,
  linkProfileAfterPortalPasswordSet,
  resolveProfilePortalLoginEmail,
} from "@/lib/portal-auth-user.server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface PortalUser {
  id: string;
  authUserId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  portalLoginEmail: string | null;
  portalAuthStatus: PortalAuthStatus;
  portalInvitedAt: string | null;
}

export interface StudentPortalAuthProfile {
  userId: string;
  authUserId: string;
  fullName: string;
  email: string | null;
  portalLoginEmail: string | null;
  portalAuthStatus: PortalAuthStatus;
}

export interface AdminStudentPortalAuthSummary {
  portalAuthStatus: PortalAuthStatus;
  portalAuthStatusLabel: string;
  portalLoginEmail: string | null;
  authUserId: string | null;
  portalInvitedAt: string | null;
  canSendInvite: boolean;
  canSetPassword: boolean;
}

interface UserPortalAuthRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  auth_user_id: string | null;
  portal_auth_status: string | null;
  portal_invited_at: string | null;
  portal_login_email: string | null;
}

const USER_PORTAL_AUTH_COLUMNS =
  "id, first_name, last_name, email, auth_user_id, portal_auth_status, portal_invited_at, portal_login_email";

function normalizePortalAuthStatus(value: string | null): PortalAuthStatus {
  if (value === "invited" || value === "active") {
    return value;
  }

  return "not_invited";
}

function mapPortalUser(row: UserPortalAuthRow): PortalUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: getStudentFullName(row.first_name, row.last_name),
    email: row.email,
    portalLoginEmail: resolvePortalLoginEmail(row.portal_login_email, row.email),
    portalAuthStatus: normalizePortalAuthStatus(row.portal_auth_status),
    portalInvitedAt: row.portal_invited_at,
  };
}

function mapPortalAuthProfile(row: UserPortalAuthRow): StudentPortalAuthProfile {
  if (!row.auth_user_id) {
    throw new Error("Student profile is not linked to a portal login.");
  }

  return {
    userId: row.id,
    authUserId: row.auth_user_id,
    fullName: getStudentFullName(row.first_name, row.last_name),
    email: row.email,
    portalLoginEmail: row.portal_login_email,
    portalAuthStatus: normalizePortalAuthStatus(row.portal_auth_status),
  };
}

export async function getPortalUserByAuthId(
  authUserId: string,
): Promise<PortalUser | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(USER_PORTAL_AUTH_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load portal user by auth id: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapPortalUser(data as UserPortalAuthRow);
}

export async function getPortalUserByStudentId(
  studentId: string,
): Promise<PortalUser | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(USER_PORTAL_AUTH_COLUMNS)
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load portal user by student id: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapPortalUser(data as UserPortalAuthRow);
}

export async function linkAuthUserToStudent(studentId: string, authUserId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      auth_user_id: authUserId,
      portal_auth_status: "active",
    })
    .eq("id", studentId);

  if (error) {
    throw new Error(`Failed to link auth user to student: ${error.message}`);
  }
}

function isMissingAuthSessionError(error: { message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("auth session missing") ||
    message.includes("session missing") ||
    (message.includes("jwt") && message.includes("does not exist"))
  );
}

export async function getSupabaseAuthSessionUser() {
  const supabase = await createSupabaseServerAuthClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isMissingAuthSessionError(error)) {
      return null;
    }

    throw new Error(`Unable to load auth session: ${error.message}`);
  }

  return data.user ?? null;
}

export type StudentPortalSessionState =
  | { status: "signed_out" }
  | { status: "unlinked" }
  | { status: "no_student_access" }
  | { status: "membership_inactive"; membershipStatus: string | null }
  | { status: "authenticated"; profile: StudentPortalAuthProfile };

async function resolveProfileForAuthUser(
  authUser: NonNullable<Awaited<ReturnType<typeof getSupabaseAuthSessionUser>>>,
): Promise<StudentPortalAuthProfile | null> {
  let row = await loadUserByAuthUserId(authUser.id);

  if (!row && authUser.email) {
    row = await loadUserByLoginEmail(authUser.email);

    if (row) {
      await linkAuthUserToStudent(row.id, authUser.id);
      row = await loadUserByAuthUserId(authUser.id);
    }
  }

  if (!row) {
    return null;
  }

  if (!row.auth_user_id) {
    await linkAuthUserToStudent(row.id, authUser.id);
    row = await loadUserByAuthUserId(authUser.id);
  }

  if (!row?.auth_user_id) {
    return null;
  }

  return mapPortalAuthProfile(row);
}

async function resolveStudentPortalSessionStateUncached(): Promise<StudentPortalSessionState> {
  const authUser = await getSupabaseAuthSessionUser();

  if (!authUser) {
    return { status: "signed_out" };
  }

  const profile = await resolveProfileForAuthUser(authUser);

  if (!profile) {
    return { status: "unlinked" };
  }

  const studentAccess = await resolveStudentPortalStudentMembershipAccess(
    profile.userId,
  );

  if (studentAccess.status === "none") {
    return { status: "no_student_access" };
  }

  if (studentAccess.status === "inactive") {
    return {
      status: "membership_inactive",
      membershipStatus: studentAccess.membershipStatus,
    };
  }

  return { status: "authenticated", profile };
}

export const resolveStudentPortalSessionState = cache(
  resolveStudentPortalSessionStateUncached,
);

async function loadUserByAuthUserId(authUserId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(USER_PORTAL_AUTH_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load student by auth user: ${error.message}`);
  }

  return data as UserPortalAuthRow | null;
}

async function loadUserByLoginEmail(email: string) {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = email.trim();

  const { data: byProfileEmail, error: profileEmailError } = await supabase
    .from("users")
    .select(USER_PORTAL_AUTH_COLUMNS)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profileEmailError) {
    throw new Error(`Failed to load student by email: ${profileEmailError.message}`);
  }

  if (byProfileEmail) {
    return byProfileEmail as UserPortalAuthRow;
  }

  const { data: byPortalEmail, error: portalEmailError } = await supabase
    .from("users")
    .select(USER_PORTAL_AUTH_COLUMNS)
    .ilike("portal_login_email", normalizedEmail)
    .maybeSingle();

  if (portalEmailError) {
    throw new Error(
      `Failed to load student by portal email: ${portalEmailError.message}`,
    );
  }

  return byPortalEmail as UserPortalAuthRow | null;
}

export const getAuthenticatedStudentPortalProfile = cache(
  async (): Promise<StudentPortalAuthProfile | null> => {
    const session = await resolveStudentPortalSessionState();

    if (session.status !== "authenticated") {
      return null;
    }

    return session.profile;
  },
);

export async function requireAuthenticatedStudentPortalProfile() {
  const profile = await getAuthenticatedStudentPortalProfile();

  if (!profile) {
    throw new Error("NOT_AUTHENTICATED");
  }

  return profile;
}

export async function getAdminStudentPortalAuthSummary(
  userId: string,
): Promise<AdminStudentPortalAuthSummary> {
  const portalUser = await getPortalUserByStudentId(userId);

  if (!portalUser) {
    throw new Error("Student not found.");
  }

  const portalAuthStatus = portalUser.portalAuthStatus;

  return {
    portalAuthStatus,
    portalAuthStatusLabel: formatPortalAuthStatusLabel(portalAuthStatus),
    portalLoginEmail: portalUser.portalLoginEmail,
    authUserId: portalUser.authUserId,
    portalInvitedAt: portalUser.portalInvitedAt,
    canSendInvite:
      Boolean(portalUser.portalLoginEmail) && portalAuthStatus !== "active",
    canSetPassword: Boolean(portalUser.portalLoginEmail),
  };
}

const MIN_PORTAL_PASSWORD_LENGTH = 8;

export function validatePortalPasswordInput(password: string, confirmPassword: string) {
  if (password.length < MIN_PORTAL_PASSWORD_LENGTH) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }
}

export async function setStudentPortalPassword(input: {
  userId: string;
  password: string;
  confirmPassword: string;
}) {
  validatePortalPasswordInput(input.password, input.confirmPassword);

  const portalUser = await getPortalUserByStudentId(input.userId);

  if (!portalUser) {
    throw new Error("Student not found.");
  }

  const loginEmail = portalUser.portalLoginEmail;

  if (!loginEmail) {
    throw new Error("Add a login email before setting a student portal password.");
  }

  const authUserId = await ensureAuthUserForPortalLogin({
    loginEmail,
    password: input.password,
    existingAuthUserId: portalUser.authUserId,
    profileUserId: input.userId,
  });

  await linkProfileAfterPortalPasswordSet({
    userId: input.userId,
    authUserId,
    loginEmail,
  });

  return { authUserId, loginEmail };
}

export async function sendStudentPortalInvite(input: {
  userId: string;
  clubId: string;
  redirectTo?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const portalUser = await getPortalUserByStudentId(input.userId);

  if (!portalUser) {
    throw new Error("Student not found.");
  }

  const loginEmail = portalUser.portalLoginEmail;

  if (!loginEmail) {
    throw new Error("Add a login email before sending a portal invite.");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const redirectTo =
    input.redirectTo ?? `${siteUrl}/student-portal/agreements`;

  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(loginEmail, {
      redirectTo,
    });

  if (inviteError) {
    throw new Error(`Failed to send portal invite: ${inviteError.message}`);
  }

  const authUserId = inviteData.user?.id ?? null;

  const { error: updateError } = await supabase
    .from("users")
    .update({
      portal_login_email: loginEmail,
      portal_auth_status: "invited",
      portal_invited_at: new Date().toISOString(),
      ...(authUserId ? { auth_user_id: authUserId } : {}),
    })
    .eq("id", input.userId);

  if (updateError) {
    throw new Error(`Failed to update portal invite status: ${updateError.message}`);
  }

  return { loginEmail, authUserId };
}

export async function signOutStudentPortal() {
  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.signOut();

  if (error && !isMissingAuthSessionError(error)) {
    throw new Error(`Failed to sign out: ${error.message}`);
  }
}
