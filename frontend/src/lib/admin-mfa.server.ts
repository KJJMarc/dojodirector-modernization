import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_MFA_FRIENDLY_NAME,
  ADMIN_MFA_INVALID_CODE_MESSAGE,
  ADMIN_MFA_PATHNAME_HEADER,
  adminNeedsMfaChallenge,
  buildAdminMfaVerifyPath,
  isSafeAdminMfaNextPath,
  isValidTotpCode,
  normalizeTotpCode,
  sanitizeAdminMfaNextPath,
} from "@/lib/admin-mfa.shared";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export interface AdminMfaAssurance {
  hasVerifiedTotp: boolean;
  currentLevel: string | null;
  verifiedTotpFactorId: string | null;
}

export interface AdminTotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export function getAdminRequestPathForMfaNext(fallback: string): string {
  const pathname = headers().get(ADMIN_MFA_PATHNAME_HEADER)?.trim() ?? "";

  if (pathname && isSafeAdminMfaNextPath(pathname)) {
    return pathname;
  }

  return sanitizeAdminMfaNextPath(fallback);
}

export async function getAdminMfaAssurance(): Promise<AdminMfaAssurance> {
  const supabase = await createSupabaseServerAuthClient();

  const [{ data: aalData }, { data: factorsData }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  const verifiedTotp = factorsData?.totp?.[0] ?? null;

  return {
    hasVerifiedTotp: Boolean(verifiedTotp),
    currentLevel: aalData?.currentLevel ?? null,
    verifiedTotpFactorId: verifiedTotp?.id ?? null,
  };
}

export async function adminSessionNeedsMfaChallenge(): Promise<boolean> {
  const assurance = await getAdminMfaAssurance();
  return adminNeedsMfaChallenge(assurance);
}

/** Redirect to MFA challenge when the session has verified TOTP but is still AAL1. */
export async function redirectToAdminMfaChallengeIfNeeded(nextPath: string) {
  if (!(await adminSessionNeedsMfaChallenge())) {
    return;
  }

  redirect(buildAdminMfaVerifyPath(sanitizeAdminMfaNextPath(nextPath)));
}

async function cleanupUnverifiedTotpFactors() {
  const supabase = await createSupabaseServerAuthClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    throw new Error(error.message);
  }

  const unverified = (data?.all ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status === "unverified",
  );

  for (const factor of unverified) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: factor.id,
    });

    if (unenrollError) {
      throw new Error(unenrollError.message);
    }
  }
}

export async function startAdminTotpEnrollment(): Promise<AdminTotpEnrollment> {
  const assurance = await getAdminMfaAssurance();

  if (assurance.hasVerifiedTotp) {
    throw new Error("Two-factor authentication is already enabled.");
  }

  await cleanupUnverifiedTotpFactors();

  const supabase = await createSupabaseServerAuthClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: ADMIN_MFA_FRIENDLY_NAME,
  });

  if (error || !data || data.type !== "totp") {
    throw new Error(error?.message ?? "Unable to start authenticator setup.");
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function verifyAdminTotpEnrollment(input: {
  factorId: string;
  code: string;
}) {
  const code = normalizeTotpCode(input.code);

  if (!isValidTotpCode(code)) {
    throw new Error(ADMIN_MFA_INVALID_CODE_MESSAGE);
  }

  const factorId = input.factorId.trim();

  if (!factorId) {
    throw new Error("Missing authenticator setup. Start setup again.");
  }

  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (error) {
    throw new Error(ADMIN_MFA_INVALID_CODE_MESSAGE);
  }
}

export async function verifyAdminTotpChallenge(code: string) {
  const normalized = normalizeTotpCode(code);

  if (!isValidTotpCode(normalized)) {
    throw new Error(ADMIN_MFA_INVALID_CODE_MESSAGE);
  }

  const assurance = await getAdminMfaAssurance();

  if (!assurance.verifiedTotpFactorId) {
    throw new Error("Two-factor authentication is not enabled on this account.");
  }

  if (assurance.currentLevel === "aal2") {
    return;
  }

  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: assurance.verifiedTotpFactorId,
    code: normalized,
  });

  if (error) {
    throw new Error(ADMIN_MFA_INVALID_CODE_MESSAGE);
  }
}

export async function disableAdminTotp(code: string) {
  const normalized = normalizeTotpCode(code);

  if (!isValidTotpCode(normalized)) {
    throw new Error(ADMIN_MFA_INVALID_CODE_MESSAGE);
  }

  const assurance = await getAdminMfaAssurance();

  if (!assurance.verifiedTotpFactorId) {
    throw new Error("Two-factor authentication is not enabled on this account.");
  }

  const supabase = await createSupabaseServerAuthClient();

  // Confirm possession of the authenticator before removing the factor.
  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: assurance.verifiedTotpFactorId,
    code: normalized,
  });

  if (verifyError) {
    throw new Error(ADMIN_MFA_INVALID_CODE_MESSAGE);
  }

  const { error: unenrollError } = await supabase.auth.mfa.unenroll({
    factorId: assurance.verifiedTotpFactorId,
  });

  if (unenrollError) {
    throw new Error(unenrollError.message);
  }

  await cleanupUnverifiedTotpFactors();
}
