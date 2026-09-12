"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";
import {
  disableAdminTotp,
  getAdminMfaAssurance,
  startAdminTotpEnrollment,
  verifyAdminTotpEnrollment,
} from "@/lib/admin-mfa.server";
import {
  logPortalAuthError,
} from "@/lib/portal-auth-errors.server";
import { mapPortalAuthError } from "@/lib/portal-auth-errors.shared";

export type AdminMfaSecurityActionResult =
  | { ok: true; enrollment?: { factorId: string; qrCode: string; secret: string } }
  | { ok: false; error: string };

function toActionError(error: unknown): AdminMfaSecurityActionResult {
  if (isRedirectError(error)) {
    throw error;
  }

  logPortalAuthError("admin.mfa.security", error);
  return {
    ok: false,
    error: mapPortalAuthError(error),
  };
}

export async function startAdminMfaEnrollmentAction(): Promise<AdminMfaSecurityActionResult> {
  try {
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
    return toActionError(error);
  }
}

export async function confirmAdminMfaEnrollmentAction(input: {
  factorId: string;
  code: string;
  revalidatePathname: string;
}): Promise<AdminMfaSecurityActionResult> {
  try {
    await verifyAdminTotpEnrollment({
      factorId: input.factorId,
      code: input.code,
    });
    revalidatePath(input.revalidatePathname);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function disableAdminMfaAction(input: {
  code: string;
  revalidatePathname: string;
}): Promise<AdminMfaSecurityActionResult> {
  try {
    await disableAdminTotp(input.code);
    revalidatePath(input.revalidatePathname);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function loadAdminMfaSecurityState() {
  const assurance = await getAdminMfaAssurance();
  return { enabled: assurance.hasVerifiedTotp };
}
