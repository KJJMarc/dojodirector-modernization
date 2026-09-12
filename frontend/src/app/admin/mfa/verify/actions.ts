"use server";

import { redirect } from "next/navigation";
import {
  adminAcademySelectPath,
  adminLoginPath,
  SUPER_ADMIN_PATH,
} from "@/lib/admin-auth.shared";
import { resolveAdminAccessForAuthUser } from "@/lib/admin-auth.server";
import {
  getAdminMfaAssurance,
  verifyAdminTotpChallenge,
} from "@/lib/admin-mfa.server";
import {
  ADMIN_MFA_INVALID_CODE_MESSAGE,
  adminNeedsMfaChallenge,
  sanitizeAdminMfaNextPath,
} from "@/lib/admin-mfa.shared";
import { throwPortalAuthError } from "@/lib/portal-auth-errors.server";
import { getSupabaseAuthSessionUser } from "@/lib/student-portal-auth.server";

function resolveDefaultAdminDestination(access: {
  isPlatformSuperAdmin: boolean;
  clubAdminMemberships: { clubSlug: string }[];
}) {
  if (access.isPlatformSuperAdmin) {
    return SUPER_ADMIN_PATH;
  }

  if (access.clubAdminMemberships.length === 1) {
    return `/admin/${access.clubAdminMemberships[0].clubSlug}`;
  }

  return adminAcademySelectPath();
}

export async function verifyAdminMfaChallengeAction(formData: FormData) {
  try {
    const authUser = await getSupabaseAuthSessionUser();

    if (!authUser) {
      redirect(adminLoginPath());
    }

    const access = await resolveAdminAccessForAuthUser(authUser.id);

    if (!access) {
      redirect(`${adminLoginPath()}?denied=1`);
    }

    const assurance = await getAdminMfaAssurance();

    if (!adminNeedsMfaChallenge(assurance)) {
      const next = sanitizeAdminMfaNextPath(
        String(formData.get("next") ?? ""),
        resolveDefaultAdminDestination(access),
      );
      redirect(next);
    }

    const code = String(formData.get("code") ?? "");
    await verifyAdminTotpChallenge(code);

    const next = sanitizeAdminMfaNextPath(
      String(formData.get("next") ?? ""),
      resolveDefaultAdminDestination(access),
    );
    redirect(next);
  } catch (error) {
    throwPortalAuthError("admin.mfa.verify", error);
  }
}

export async function getAdminMfaChallengePageState(nextParam?: string) {
  const authUser = await getSupabaseAuthSessionUser();

  if (!authUser) {
    redirect(adminLoginPath());
  }

  const access = await resolveAdminAccessForAuthUser(authUser.id);

  if (!access) {
    redirect(`${adminLoginPath()}?denied=1`);
  }

  const assurance = await getAdminMfaAssurance();
  const defaultDestination = resolveDefaultAdminDestination(access);
  const next = sanitizeAdminMfaNextPath(nextParam, defaultDestination);

  if (!assurance.hasVerifiedTotp) {
    redirect(next);
  }

  if (!adminNeedsMfaChallenge(assurance)) {
    redirect(next);
  }

  return { next, invalidCodeHint: ADMIN_MFA_INVALID_CODE_MESSAGE };
}
