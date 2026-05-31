import "server-only";

import { redirect } from "next/navigation";
import { getStudentFullName } from "@/lib/attendance";
import {
  ADMIN_ACCESS_DENIED_MESSAGE,
  adminAccessPath,
  isAdminLoginRole,
  isClubAdminMembershipRole,
  isSuperAdminMembershipRole,
  membershipGrantsAdminDashboardPanel,
  SUPER_ADMIN_PATH,
} from "@/lib/admin-auth.shared";
import type { AdminDashboardAccessSummary } from "@/lib/admin-student-profile.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import { getClubBySlug, requireClubBySlug } from "@/lib/clubs.server";
import { ensureAuthUserForPortalLogin } from "@/lib/portal-auth-user.server";
import {
  getSupabaseAuthSessionUser,
  validatePortalPasswordInput,
} from "@/lib/student-portal-auth.server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AdminAuthSession {
  authUserId: string;
  userId: string;
  fullName: string;
  email: string | null;
  role: string;
  isPlatformSuperAdmin: boolean;
}

export type AdminSessionState =
  | { status: "signed_out" }
  | { status: "forbidden" }
  | { status: "authenticated"; session: AdminAuthSession };

export interface AdminMembershipWithClub {
  clubId: string;
  clubSlug: string;
  clubName: string;
  role: string;
  status: string | null;
}

export interface ResolvedAdminAccess {
  isPlatformSuperAdmin: boolean;
  clubAdminMemberships: AdminMembershipWithClub[];
  primaryLoginRole: string | null;
}

interface MembershipAuthRow {
  user_id: string;
  role: string | null;
  status: string | null;
  club_id: string;
  clubs:
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null;
}

interface UserAuthRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  auth_user_id: string | null;
}

const USER_AUTH_COLUMNS = "id, first_name, last_name, email, auth_user_id";

function isMissingAuthSessionError(error: { message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("auth session missing") ||
    message.includes("session missing") ||
    (message.includes("jwt") && message.includes("does not exist"))
  );
}

export function isActiveAdminMembershipStatus(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase();

  if (!normalized || normalized === "active" || normalized === "trial") {
    return true;
  }

  return false;
}

function normalizeClubJoin(
  clubs: MembershipAuthRow["clubs"],
): { slug: string; name: string } | null {
  if (!clubs) {
    return null;
  }

  return Array.isArray(clubs) ? (clubs[0] ?? null) : clubs;
}

export function resolveAdminAccessFromMemberships(
  memberships: AdminMembershipWithClub[],
): ResolvedAdminAccess {
  const activeMemberships = memberships.filter((membership) =>
    isActiveAdminMembershipStatus(membership.status),
  );
  const isPlatformSuperAdmin = activeMemberships.some((membership) =>
    isSuperAdminMembershipRole(membership.role),
  );
  const clubAdminMemberships = activeMemberships.filter((membership) =>
    isClubAdminMembershipRole(membership.role),
  );

  const primaryLoginRole = isPlatformSuperAdmin
    ? "super_admin"
    : (clubAdminMemberships[0]?.role ?? null);

  return {
    isPlatformSuperAdmin,
    clubAdminMemberships,
    primaryLoginRole,
  };
}

interface MembershipRoleRow {
  role: string | null;
  status: string | null;
  club_id: string;
}

async function loadClubDetailsById(clubIds: string[]) {
  const clubById = new Map<string, { slug: string; name: string }>();

  if (clubIds.length === 0) {
    return clubById;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, name")
    .in("id", clubIds);

  if (error) {
    throw new Error(`Failed to load clubs for admin access: ${error.message}`);
  }

  for (const club of (data ?? []) as { id: string; slug: string; name: string }[]) {
    clubById.set(club.id, { slug: club.slug, name: club.name });
  }

  return clubById;
}

export async function loadActiveAdminMembershipRoleRows(
  userId: string,
): Promise<MembershipRoleRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, status, club_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load memberships: ${error.message}`);
  }

  return ((data ?? []) as MembershipRoleRow[]).filter((row) =>
    membershipGrantsAdminDashboardPanel(row.role, row.status),
  );
}

export async function userHasAdminLoginMembership(userId: string): Promise<boolean> {
  const rows = await loadActiveAdminMembershipRoleRows(userId);
  return rows.some(
    (row) =>
      isAdminLoginRole(row.role) && isActiveAdminMembershipStatus(row.status),
  );
}

export async function userHasAdminLoginAccess(userId: string): Promise<boolean> {
  return userHasAdminLoginMembership(userId);
}

export async function loadAdminMembershipsForUser(
  userId: string,
): Promise<AdminMembershipWithClub[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, status, club_id, clubs ( slug, name )")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load admin memberships: ${error.message}`);
  }

  const adminRows = (data ?? []) as MembershipAuthRow[];
  const clubIds = Array.from(
    new Set(
      adminRows
        .filter((row) => isAdminLoginRole(row.role))
        .map((row) => row.club_id),
    ),
  );
  const clubById = await loadClubDetailsById(clubIds);
  const memberships: AdminMembershipWithClub[] = [];

  for (const row of adminRows) {
    if (!isAdminLoginRole(row.role)) {
      continue;
    }

    const joinedClub = normalizeClubJoin(row.clubs);
    const club = joinedClub ?? clubById.get(row.club_id) ?? null;

    if (!club?.slug) {
      continue;
    }

    memberships.push({
      clubId: row.club_id,
      clubSlug: club.slug,
      clubName: club.name,
      role: row.role ?? "admin",
      status: row.status,
    });
  }

  return memberships;
}

export async function resolveAdminAccessForAuthUser(
  authUserId: string,
): Promise<ResolvedAdminAccess | null> {
  const user = await loadUserByAuthUserId(authUserId);

  if (!user) {
    return null;
  }

  const memberships = await loadAdminMembershipsForUser(user.id);
  const access = resolveAdminAccessFromMemberships(memberships);

  if (!access.isPlatformSuperAdmin && access.clubAdminMemberships.length === 0) {
    return null;
  }

  return access;
}

export async function userCanAccessClubAdmin(
  authUserId: string,
  clubId: string,
): Promise<boolean> {
  const access = await resolveAdminAccessForAuthUser(authUserId);

  if (!access) {
    return false;
  }

  if (access.isPlatformSuperAdmin) {
    return true;
  }

  return access.clubAdminMemberships.some(
    (membership) =>
      membership.clubId === clubId && isClubAdminMembershipRole(membership.role),
  );
}

async function loadUserByAuthUserId(authUserId: string): Promise<UserAuthRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(USER_AUTH_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user for admin auth: ${error.message}`);
  }

  return (data as UserAuthRow | null) ?? null;
}

async function loadUserByEmail(email: string): Promise<UserAuthRow | null> {
  const supabase = getSupabaseAdminClient();
  const normalizedEmail = email.trim();

  const { data, error } = await supabase
    .from("users")
    .select(USER_AUTH_COLUMNS)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user by email: ${error.message}`);
  }

  return (data as UserAuthRow | null) ?? null;
}

async function loadUserById(userId: string): Promise<UserAuthRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select(USER_AUTH_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user: ${error.message}`);
  }

  return (data as UserAuthRow | null) ?? null;
}

async function linkAuthUserIdToProfile(userId: string, authUserId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ auth_user_id: authUserId })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to link admin auth user: ${error.message}`);
  }
}

export async function linkAdminAuthUserAfterSignIn(
  authUserId: string,
  email: string,
): Promise<void> {
  let user = await loadUserByAuthUserId(authUserId);

  if (!user) {
    user = await loadUserByEmail(email);
  }

  if (!user) {
    return;
  }

  if (user.auth_user_id !== authUserId) {
    await linkAuthUserIdToProfile(user.id, authUserId);
  }
}

async function resolveUserForAuthSession(authUser: {
  id: string;
  email?: string | null;
}) {
  let user = await loadUserByAuthUserId(authUser.id);

  if (!user && authUser.email) {
    const byEmail = await loadUserByEmail(authUser.email);

    if (byEmail) {
      await linkAuthUserIdToProfile(byEmail.id, authUser.id);
      user = await loadUserByAuthUserId(authUser.id);
    }
  }

  return user;
}

export async function resolvePostAdminLoginRedirect(
  authUserId: string,
  loginClubSlug: string,
): Promise<string | null> {
  const access = await resolveAdminAccessForAuthUser(authUserId);

  if (!access) {
    return null;
  }

  if (access.isPlatformSuperAdmin) {
    return SUPER_ADMIN_PATH;
  }

  const loginClub = await getClubBySlug(loginClubSlug);
  const memberships = access.clubAdminMemberships;

  if (loginClub) {
    const atLoginClub = memberships.find(
      (membership) => membership.clubId === loginClub.id,
    );

    if (atLoginClub) {
      return clubAdminPath(atLoginClub.clubSlug);
    }
  }

  if (memberships.length === 1) {
    return clubAdminPath(memberships[0].clubSlug);
  }

  return null;
}

export async function resolveAdminSessionState(
  clubId: string,
): Promise<AdminSessionState> {
  const authUser = await getSupabaseAuthSessionUser();

  if (!authUser) {
    return { status: "signed_out" };
  }

  const user = await resolveUserForAuthSession(authUser);

  if (!user) {
    return { status: "forbidden" };
  }

  const access = await resolveAdminAccessFromMemberships(
    await loadAdminMembershipsForUser(user.id),
  );

  if (!access.isPlatformSuperAdmin && access.clubAdminMemberships.length === 0) {
    return { status: "forbidden" };
  }

  const canAccessClub =
    access.isPlatformSuperAdmin ||
    access.clubAdminMemberships.some(
      (membership) =>
        membership.clubId === clubId && isClubAdminMembershipRole(membership.role),
    );

  if (!canAccessClub) {
    return { status: "forbidden" };
  }

  const clubMembership =
    access.clubAdminMemberships.find((membership) => membership.clubId === clubId) ??
    null;
  const role = access.isPlatformSuperAdmin
    ? "super_admin"
    : (clubMembership?.role ?? "admin");

  return {
    status: "authenticated",
    session: {
      authUserId: authUser.id,
      userId: user.id,
      fullName: getStudentFullName(user.first_name, user.last_name),
      email: user.email,
      role,
      isPlatformSuperAdmin: access.isPlatformSuperAdmin,
    },
  };
}

export async function resolveSuperAdminSessionState(): Promise<AdminSessionState> {
  const authUser = await getSupabaseAuthSessionUser();

  if (!authUser) {
    return { status: "signed_out" };
  }

  const user = await resolveUserForAuthSession(authUser);

  if (!user) {
    return { status: "forbidden" };
  }

  const access = await resolveAdminAccessFromMemberships(
    await loadAdminMembershipsForUser(user.id),
  );

  if (!access.isPlatformSuperAdmin) {
    return { status: "forbidden" };
  }

  return {
    status: "authenticated",
    session: {
      authUserId: authUser.id,
      userId: user.id,
      fullName: getStudentFullName(user.first_name, user.last_name),
      email: user.email,
      role: "super_admin",
      isPlatformSuperAdmin: true,
    },
  };
}

export async function requireAdminAccessForClubSlug(clubSlug: string) {
  const club = await requireClubBySlug(clubSlug);
  const state = await resolveAdminSessionState(club.id);

  if (state.status === "signed_out") {
    redirect(adminAccessPath(club.slug));
  }

  if (state.status === "forbidden") {
    const authUser = await getSupabaseAuthSessionUser();

    if (authUser) {
      const access = await resolveAdminAccessForAuthUser(authUser.id);

      if (access?.isPlatformSuperAdmin) {
        redirect(SUPER_ADMIN_PATH);
      }

      if (access && access.clubAdminMemberships.length > 0) {
        redirect(clubAdminPath(access.clubAdminMemberships[0].clubSlug));
      }
    }

    redirect(`${adminAccessPath(club.slug)}?denied=1`);
  }

  return { club, session: state.session };
}

export async function requireSuperAdminAccess() {
  const state = await resolveSuperAdminSessionState();

  if (state.status === "signed_out") {
    redirect(adminAccessPath("kingston-jiu-jitsu"));
  }

  if (state.status === "forbidden") {
    const authUser = await getSupabaseAuthSessionUser();

    if (authUser) {
      const access = await resolveAdminAccessForAuthUser(authUser.id);

      if (access && access.clubAdminMemberships.length > 0) {
        redirect(clubAdminPath(access.clubAdminMemberships[0].clubSlug));
      }
    }

    redirect(`${adminAccessPath("kingston-jiu-jitsu")}?denied=1`);
  }

  return { session: state.session };
}

export async function signOutAdminAccess() {
  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error && !isMissingAuthSessionError(error)) {
    throw new Error(`Failed to sign out: ${error.message}`);
  }
}

export async function signInAdminAccessAndRedirect(formData: FormData) {
  const clubSlug = String(formData.get("clubSlug") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!clubSlug) {
    throw new Error("Club is required.");
  }

  if (!email || !password) {
    throw new Error("Enter your email and password.");
  }

  await requireClubBySlug(clubSlug);
  const supabase = await createSupabaseServerAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error("Sign in failed. Check your email and password.");
  }

  if (!data.user?.id) {
    throw new Error("Sign in failed. Check your email and password.");
  }

  await linkAdminAuthUserAfterSignIn(data.user.id, email);

  const destination = await resolvePostAdminLoginRedirect(data.user.id, clubSlug);

  if (!destination) {
    await signOutAdminAccess();
    throw new Error(ADMIN_ACCESS_DENIED_MESSAGE);
  }

  redirect(destination);
}

export async function getAdminAccessSummaryForUser(userId: string) {
  const user = await loadUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const hasAdminAccess = await userHasAdminLoginAccess(userId);
  const memberships = hasAdminAccess
    ? await loadAdminMembershipsForUser(userId)
    : [];
  const access = resolveAdminAccessFromMemberships(memberships);
  const loginEmail = user.email?.trim() || null;
  const hasAuthLogin = Boolean(user.auth_user_id);
  const canManagePassword = Boolean(loginEmail) && hasAdminAccess;

  return {
    loginEmail,
    authUserId: user.auth_user_id,
    hasAuthLogin,
    canSetPassword: canManagePassword,
    canChangePassword: canManagePassword && hasAuthLogin,
    canClearAccess: hasAuthLogin && hasAdminAccess,
    isPlatformSuperAdmin: access.isPlatformSuperAdmin,
    isClubAdmin: access.clubAdminMemberships.length > 0,
    showPanel: hasAdminAccess,
  };
}

export function createAdminDashboardAccessSummary(input: {
  profileEmail: string | null;
  membershipRole: string | null;
  membershipStatus: string | null;
  summary: Awaited<ReturnType<typeof getAdminAccessSummaryForUser>>;
}): AdminDashboardAccessSummary {
  const loginEmail = input.profileEmail?.trim() || input.summary.loginEmail;
  const hasAuthLogin = input.summary.hasAuthLogin;
  const canSetPassword = Boolean(loginEmail);

  return {
    loginEmail: loginEmail ?? null,
    hasAuthLogin,
    canSetPassword,
    canChangePassword: canSetPassword && hasAuthLogin,
    canClearAccess: hasAuthLogin,
    isPlatformSuperAdmin:
      input.summary.isPlatformSuperAdmin ||
      isSuperAdminMembershipRole(input.membershipRole),
    isClubAdmin:
      input.summary.isClubAdmin ||
      isClubAdminMembershipRole(input.membershipRole),
    showPanel: true,
  };
}

export function buildAdminDashboardAccessForProfile(input: {
  profileEmail: string | null;
  membershipRole: string | null;
  membershipStatus: string | null;
  summary: Awaited<ReturnType<typeof getAdminAccessSummaryForUser>>;
}): AdminDashboardAccessSummary | null {
  const showPanel =
    input.summary.showPanel ||
    membershipGrantsAdminDashboardPanel(
      input.membershipRole,
      input.membershipStatus,
    );

  if (!showPanel) {
    return null;
  }

  return createAdminDashboardAccessSummary(input);
}

export async function setAdminAccessPassword(input: {
  userId: string;
  password: string;
  confirmPassword: string;
}) {
  validatePortalPasswordInput(input.password, input.confirmPassword);

  const user = await loadUserById(input.userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const hadAuthLogin = Boolean(user.auth_user_id);
  const loginEmail = user.email?.trim();

  if (!loginEmail) {
    throw new Error("Add a profile email before setting an admin login password.");
  }

  if (!(await userHasAdminLoginAccess(user.id))) {
    throw new Error(ADMIN_ACCESS_DENIED_MESSAGE);
  }

  const authUserId = await ensureAuthUserForPortalLogin({
    loginEmail,
    password: input.password,
    existingAuthUserId: user.auth_user_id,
    profileUserId: user.id,
  });

  if (user.auth_user_id !== authUserId) {
    await linkAuthUserIdToProfile(user.id, authUserId);
  }

  return { authUserId, loginEmail, hadAuthLogin };
}

export async function clearAdminAccessLogin(userId: string) {
  const user = await loadUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.auth_user_id) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ auth_user_id: null })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to clear admin login link: ${error.message}`);
  }
}
