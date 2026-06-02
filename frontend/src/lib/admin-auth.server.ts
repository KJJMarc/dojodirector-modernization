import "server-only";

import { redirect } from "next/navigation";
import { getStudentFullName } from "@/lib/attendance";
import {
  ADMIN_ACCESS_DENIED_MESSAGE,
  adminAccessPath,
  adminAcademySelectPath,
  adminLoginPath,
  type AdminLoginIntent,
  isAdminLoginRole,
  isClubAdminMembershipRole,
  isSuperAdminMembershipRole,
  membershipGrantsAdminDashboardPanel,
  superAdminLoginPath,
  SUPER_ADMIN_PATH,
} from "@/lib/admin-auth.shared";
import type { AdminDashboardAccessSummary } from "@/lib/admin-student-profile.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import { getClubBySlug, requireClubBySlug } from "@/lib/clubs.server";
import {
  ensureAuthUserForPortalLogin,
  linkProfileAfterPortalPasswordSet,
  loadPortalAuthLinkProfile,
  profileBlocksUnlinkingAuthUser,
  resolveProfilePortalLoginEmail,
} from "@/lib/portal-auth-user.server";
import { resolvePortalLoginEmail } from "@/lib/student-portal-auth.shared";
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

export function resolveAccessibleAcademyAdminMemberships(
  memberships: AdminMembershipWithClub[],
): AdminMembershipWithClub[] {
  const byClubId = new Map<string, AdminMembershipWithClub>();

  for (const membership of memberships) {
    if (!isActiveAdminMembershipStatus(membership.status)) {
      continue;
    }

    if (
      !isClubAdminMembershipRole(membership.role) &&
      !isSuperAdminMembershipRole(membership.role)
    ) {
      continue;
    }

    const existing = byClubId.get(membership.clubId);

    if (!existing) {
      byClubId.set(membership.clubId, membership);
      continue;
    }

    if (
      isClubAdminMembershipRole(membership.role) &&
      isSuperAdminMembershipRole(existing.role)
    ) {
      byClubId.set(membership.clubId, membership);
    }
  }

  return Array.from(byClubId.values()).sort((left, right) =>
    left.clubName.localeCompare(right.clubName, "en", { sensitivity: "base" }),
  );
}

export async function loadAccessibleAcademyAdminMembershipsForAuthUser(
  authUserId: string,
): Promise<AdminMembershipWithClub[]> {
  const user = await loadUserByAuthUserId(authUserId);

  if (!user) {
    return [];
  }

  const memberships = await loadAdminMembershipsForUser(user.id);
  return resolveAccessibleAcademyAdminMemberships(memberships);
}

export async function resolveAcademyAdminLoginDestination(
  authUserId: string,
): Promise<string | null> {
  const academies = await loadAccessibleAcademyAdminMembershipsForAuthUser(authUserId);

  if (academies.length === 0) {
    return null;
  }

  if (academies.length === 1) {
    return clubAdminPath(academies[0].clubSlug);
  }

  return adminAcademySelectPath();
}

export async function resolvePostAdminLoginRedirect(
  authUserId: string,
  options: { intent: AdminLoginIntent; clubSlug?: string },
): Promise<string | null> {
  const access = await resolveAdminAccessForAuthUser(authUserId);

  if (!access) {
    return null;
  }

  if (options.intent === "super_admin") {
    if (access.isPlatformSuperAdmin) {
      return SUPER_ADMIN_PATH;
    }

    return resolveAcademyAdminLoginDestination(authUserId);
  }

  if (options.intent === "legacy_club") {
    const clubSlug = options.clubSlug?.trim();

    if (clubSlug) {
      const loginClub = await getClubBySlug(clubSlug);

      if (loginClub) {
        const canAccessLegacyClub =
          access.isPlatformSuperAdmin ||
          access.clubAdminMemberships.some(
            (membership) =>
              membership.clubId === loginClub.id &&
              isClubAdminMembershipRole(membership.role) &&
              isActiveAdminMembershipStatus(membership.status),
          );

        if (canAccessLegacyClub) {
          return clubAdminPath(loginClub.slug);
        }
      }
    }

    return resolveAcademyAdminLoginDestination(authUserId);
  }

  return resolveAcademyAdminLoginDestination(authUserId);
}

export async function requireAcademyAdminSelectionAccess(): Promise<
  AdminMembershipWithClub[]
> {
  const authUser = await getSupabaseAuthSessionUser();

  if (!authUser) {
    redirect(adminLoginPath());
  }

  const academies = await loadAccessibleAcademyAdminMembershipsForAuthUser(authUser.id);

  if (academies.length === 0) {
    redirect(`${adminLoginPath()}?denied=1`);
  }

  if (academies.length === 1) {
    redirect(clubAdminPath(academies[0].clubSlug));
  }

  return academies;
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
    redirect(superAdminLoginPath());
  }

  if (state.status === "forbidden") {
    const authUser = await getSupabaseAuthSessionUser();

    if (authUser) {
      const access = await resolveAdminAccessForAuthUser(authUser.id);

      if (access && access.clubAdminMemberships.length > 0) {
        redirect(clubAdminPath(access.clubAdminMemberships[0].clubSlug));
      }
    }

    redirect(`${superAdminLoginPath()}?denied=1`);
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

export async function signInAdminAccessAndRedirect(
  formData: FormData,
  intent: AdminLoginIntent = "legacy_club",
) {
  const clubSlug = String(formData.get("clubSlug") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (intent === "legacy_club" && !clubSlug) {
    throw new Error("Club is required.");
  }

  if (!email || !password) {
    throw new Error("Enter your email and password.");
  }

  if (intent === "legacy_club") {
    await requireClubBySlug(clubSlug);
  }

  const supabase = await createSupabaseServerAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error("Sign in failed. Check your email and password.");
  }

  if (!data.user?.id) {
    throw new Error("Sign in failed. Check your email and password.");
  }

  await linkAdminAuthUserAfterSignIn(data.user.id, email);

  if (intent === "super_admin") {
    const access = await resolveAdminAccessForAuthUser(data.user.id);

    if (!access?.isPlatformSuperAdmin) {
      await signOutAdminAccess();
      throw new Error(ADMIN_ACCESS_DENIED_MESSAGE);
    }

    redirect(SUPER_ADMIN_PATH);
  }

  const destination = await resolvePostAdminLoginRedirect(data.user.id, {
    intent,
    clubSlug: clubSlug || undefined,
  });

  if (!destination) {
    await signOutAdminAccess();
    throw new Error(ADMIN_ACCESS_DENIED_MESSAGE);
  }

  redirect(destination);
}

export async function getAdminAccessSummaryForUser(userId: string) {
  const profile = await loadPortalAuthLinkProfile(userId);

  if (!profile) {
    throw new Error("User not found.");
  }

  const hasAdminAccess = await userHasAdminLoginAccess(userId);
  const memberships = hasAdminAccess
    ? await loadAdminMembershipsForUser(userId)
    : [];
  const access = resolveAdminAccessFromMemberships(memberships);
  const loginEmail = resolveProfilePortalLoginEmail(profile)?.trim() || null;
  const hasAuthLogin = Boolean(profile.auth_user_id);
  const canManagePassword = Boolean(loginEmail) && hasAdminAccess;
  const canClearAccess =
    hasAuthLogin &&
    hasAdminAccess &&
    !profileBlocksUnlinkingAuthUser(profile);

  return {
    loginEmail,
    portalLoginEmail: profile.portal_login_email,
    authUserId: profile.auth_user_id,
    hasAuthLogin,
    canSetPassword: canManagePassword,
    canChangePassword: canManagePassword && hasAuthLogin,
    canClearAccess,
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
  const loginEmail =
    resolvePortalLoginEmail(
      input.summary.portalLoginEmail,
      input.profileEmail,
    )?.trim() ||
    input.summary.loginEmail;
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

  const profile = await loadPortalAuthLinkProfile(input.userId);

  if (!profile) {
    throw new Error("User not found.");
  }

  const hadAuthLogin = Boolean(profile.auth_user_id);
  const loginEmail = resolveProfilePortalLoginEmail(profile)?.trim();

  if (!loginEmail) {
    throw new Error(
      "Add a profile or portal login email before setting a login password.",
    );
  }

  if (!(await userHasAdminLoginAccess(profile.id))) {
    throw new Error(ADMIN_ACCESS_DENIED_MESSAGE);
  }

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

  return { authUserId, loginEmail, hadAuthLogin };
}

const CLEAR_ADMIN_AUTH_BLOCKED_MESSAGE =
  "Cannot clear login while student or instructor portal access uses this Supabase account. The same email and password are shared across admin, student, and instructor sign-in.";

export async function clearAdminAccessLogin(userId: string) {
  const profile = await loadPortalAuthLinkProfile(userId);

  if (!profile) {
    throw new Error("User not found.");
  }

  if (!profile.auth_user_id) {
    return;
  }

  if (profileBlocksUnlinkingAuthUser(profile)) {
    throw new Error(CLEAR_ADMIN_AUTH_BLOCKED_MESSAGE);
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ auth_user_id: null })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to clear login link: ${error.message}`);
  }
}
