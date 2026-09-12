"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";
import {
  adminAcademySelectPath,
  adminLoginPath,
  SUPER_ADMIN_PATH,
} from "@/lib/admin-auth.shared";
import { resolveAdminAccessForAuthUser } from "@/lib/admin-auth.server";
import {
  getAdminMfaAssurance,
  startAdminTotpEnrollment,
  verifyAdminTotpEnrollment,
} from "@/lib/admin-mfa.server";
import {
  ADMIN_MFA_SETUP_REQUIRED_MESSAGE,
  buildAdminMfaVerifyPath,
  resolveAdminMfaGate,
  sanitizeAdminMfaNextPath,
} from "@/lib/admin-mfa.shared";
import {
  logPortalAuthError,
  throwPortalAuthError,
} from "@/lib/portal-auth-errors.server";
import { mapPortalAuthError } from "@/lib/portal-auth-errors.shared";
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

export type AdminMfaSetupActionResult =
  | { ok: true; enrollment?: { factorId: string; qrCode: string; secret: string } }
  | { ok: false; error: string };

function toSetupActionError(error: unknown): AdminMfaSetupActionResult {
  if (isRedirectError(error)) {
    throw error;
  }

  logPortalAuthError("admin.mfa.setup", error);
  return { ok: false, error: mapPortalAuthError(error) };
}

export async function getAdminMfaSetupPageState(nextParam?: string) {
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
  const decision = resolveAdminMfaGate(assurance);

  if (decision === "allow") {
    redirect(next);
  }

  if (decision === "verify") {
    redirect(buildAdminMfaVerifyPath(next));
  }

  return { next, setupMessage: ADMIN_MFA_SETUP_REQUIRED_MESSAGE };
}

export async function startMandatoryAdminMfaEnrollmentAction(): Promise<AdminMfaSetupActionResult> {
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

    if (resolveAdminMfaGate(assurance) !== "setup") {
      return { ok: false, error: "Two-factor authentication is already enabled." };
    }

    const enrollment = await startAdminTotpEnrollment();
    return {
      ok: true,
      enrollment: {
        factorId: enrollment.factorId,
        qrCode: enrollment.qrCode,
        secret: enrollment.secret,
      },
    };
  } catch (error) {
    return toSetupActionError(error);
  }
}

export async function confirmMandatoryAdminMfaEnrollmentAction(formData: FormData) {
  try {
    const authUser = await getSupabaseAuthSessionUser();

    if (!authUser) {
      redirect(adminLoginPath());
    }

    const access = await resolveAdminAccessForAuthUser(authUser.id);

    if (!access) {
      redirect(`${adminLoginPath()}?denied=1`);
    }

    const factorId = String(formData.get("factorId") ?? "");
    const code = String(formData.get("code") ?? "");
    const next = sanitizeAdminMfaNextPath(
      String(formData.get("next") ?? ""),
      resolveDefaultAdminDestination(access),
    );

    await verifyAdminTotpEnrollment({ factorId, code });
    redirect(next);
  } catch (error) {
    throwPortalAuthError("admin.mfa.setup.confirm", error);
  }
}
