import "server-only";

import { isSuperAdminMembershipRole } from "@/lib/admin-auth.shared";
import {
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { findAuthUserIdByEmail } from "@/lib/portal-auth-user.server";
import { sendPasswordResetEmail } from "@/lib/password-reset-email.server";
import {
  buildPasswordResetConfirmUrl,
  PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE,
} from "@/lib/password-reset.shared";
import { resolveSiteOrigin } from "@/lib/site-origin.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const USER_PASSWORD_RESET_COLUMNS =
  "id, auth_user_id, email, portal_login_email, instructor_portal_login_email, portal_auth_status, instructor_portal_auth_status";

interface PasswordResetProfileRow {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  portal_login_email: string | null;
  instructor_portal_login_email: string | null;
  portal_auth_status: string | null;
  instructor_portal_auth_status: string | null;
}

interface MembershipClubRow {
  role: string | null;
  status: string | null;
  clubs: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeClubJoin(
  clubs: MembershipClubRow["clubs"],
): { slug: string; name: string } | null {
  if (!clubs) {
    return null;
  }

  return Array.isArray(clubs) ? (clubs[0] ?? null) : clubs;
}

async function loadProfileByLoginEmail(
  email: string,
): Promise<PasswordResetProfileRow | null> {
  const supabase = getSupabaseAdminClient();
  const normalized = normalizeEmail(email);

  const { data: byPortal, error: portalError } = await supabase
    .from("users")
    .select(USER_PASSWORD_RESET_COLUMNS)
    .ilike("portal_login_email", normalized)
    .maybeSingle();

  if (portalError) {
    throw new Error(`Failed to look up account: ${portalError.message}`);
  }

  if (byPortal) {
    return byPortal as PasswordResetProfileRow;
  }

  const { data: byInstructor, error: instructorError } = await supabase
    .from("users")
    .select(USER_PASSWORD_RESET_COLUMNS)
    .ilike("instructor_portal_login_email", normalized)
    .maybeSingle();

  if (instructorError) {
    throw new Error(`Failed to look up account: ${instructorError.message}`);
  }

  if (byInstructor) {
    return byInstructor as PasswordResetProfileRow;
  }

  const { data: byProfile, error: profileError } = await supabase
    .from("users")
    .select(USER_PASSWORD_RESET_COLUMNS)
    .ilike("email", normalized)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to look up account: ${profileError.message}`);
  }

  return (byProfile as PasswordResetProfileRow | null) ?? null;
}

async function loadMembershipsForUser(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, status, clubs ( slug, name )")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load memberships: ${error.message}`);
  }

  return (data ?? []) as MembershipClubRow[];
}

function isPasswordResetAllowed(memberships: MembershipClubRow[]): boolean {
  if (memberships.length === 0) {
    return true;
  }

  if (memberships.some((row) => isSuperAdminMembershipRole(row.role))) {
    return true;
  }

  return memberships.some((row) => isActiveMembershipStatus(row.status));
}

async function resolveAcademyForPasswordReset(userId: string): Promise<{
  clubSlug: string | null;
  academyName: string | null;
}> {
  const memberships = await loadMembershipsForUser(userId);
  const activeClubs = memberships
    .filter((row) => isActiveMembershipStatus(row.status))
    .map((row) => normalizeClubJoin(row.clubs))
    .filter((club): club is { slug: string; name: string } => Boolean(club?.slug));

  if (activeClubs.length === 0) {
    return { clubSlug: null, academyName: null };
  }

  const bySlug = new Map(activeClubs.map((club) => [club.slug, club]));

  if (bySlug.has(KINGSTON_CLUB_SLUG)) {
    const club = bySlug.get(KINGSTON_CLUB_SLUG)!;
    return { clubSlug: club.slug, academyName: club.name };
  }

  if (bySlug.has(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG)) {
    const club = bySlug.get(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG)!;
    return { clubSlug: club.slug, academyName: club.name };
  }

  const first = activeClubs[0];

  return first ? { clubSlug: first.slug, academyName: first.name } : { clubSlug: null, academyName: null };
}

async function resolveAuthEmailForReset(
  loginEmail: string,
  profile: PasswordResetProfileRow | null,
): Promise<string | null> {
  const authUserId =
    profile?.auth_user_id ?? (await findAuthUserIdByEmail(loginEmail));

  if (!authUserId) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(authUserId);

  if (error) {
    throw new Error(`Failed to load auth user: ${error.message}`);
  }

  return data.user?.email?.trim().toLowerCase() ?? null;
}

function logPasswordResetFailure(message: string) {
  console.error("[password-reset]", { message });
}

export async function requestPasswordResetEmail(
  rawEmail: string,
): Promise<{ message: string }> {
  const loginEmail = normalizeEmail(rawEmail);

  if (!loginEmail || !isValidEmail(loginEmail)) {
    return { message: PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE };
  }

  try {
    const profile = await loadProfileByLoginEmail(loginEmail);
    const authEmail = await resolveAuthEmailForReset(loginEmail, profile);

    if (!authEmail) {
      return { message: PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE };
    }

    if (profile) {
      const memberships = await loadMembershipsForUser(profile.id);

      if (!isPasswordResetAllowed(memberships)) {
        return { message: PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE };
      }
    }

    const academy = profile
      ? await resolveAcademyForPasswordReset(profile.id)
      : { clubSlug: null, academyName: null };

    const supabase = getSupabaseAdminClient();
    const siteOrigin = resolveSiteOrigin();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: authEmail,
      options: {
        redirectTo: `${siteOrigin}/reset-password`,
      },
    });

    if (error) {
      logPasswordResetFailure(error.message);
      return { message: PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE };
    }

    const hashedToken = data.properties?.hashed_token?.trim();

    if (!hashedToken) {
      logPasswordResetFailure("Recovery token was not generated.");
      return { message: PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE };
    }

    const resetLink = buildPasswordResetConfirmUrl(siteOrigin, hashedToken);

    await sendPasswordResetEmail({
      clubSlug: academy.clubSlug,
      academyName: academy.academyName,
      to: authEmail,
      resetLink,
    });
  } catch (error) {
    logPasswordResetFailure(
      error instanceof Error ? error.message : "Password reset request failed.",
    );
  }

  return { message: PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE };
}
