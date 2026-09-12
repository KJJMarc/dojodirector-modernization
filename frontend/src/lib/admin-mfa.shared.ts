import { clubAdminPath } from "@/lib/clubs.shared";
import { SUPER_ADMIN_PATH } from "@/lib/admin-auth.shared";

export const ADMIN_MFA_VERIFY_PATH = "/admin/mfa/verify";
export const ADMIN_MFA_SETUP_PATH = "/admin/mfa/setup";
export const SUPER_ADMIN_SECURITY_PATH = "/super-admin/security";
export const ADMIN_MFA_FRIENDLY_NAME = "Dojo Director Admin";
/** Request header set by middleware so server guards can restore the intended path after MFA. */
export const ADMIN_MFA_PATHNAME_HEADER = "x-dojo-pathname";

export const ADMIN_MFA_INVALID_CODE_MESSAGE =
  "That authenticator code is invalid or expired. Try again.";

export const ADMIN_MFA_REQUIRED_MESSAGE =
  "Enter the 6-digit code from your authenticator app to continue.";

export const ADMIN_MFA_SETUP_REQUIRED_MESSAGE =
  "Admin accounts must set up two-factor authentication before continuing.";

export type AdminMfaGateDecision = "allow" | "setup" | "verify";

export function clubAdminSecurityPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "security");
}

/**
 * Mandatory admin MFA gate:
 * - no verified TOTP → must enroll (setup)
 * - verified TOTP + not AAL2 → must challenge (verify)
 * - verified TOTP + AAL2 → allow
 */
export function resolveAdminMfaGate(input: {
  hasVerifiedTotp: boolean;
  currentLevel: string | null | undefined;
}): AdminMfaGateDecision {
  if (!input.hasVerifiedTotp) {
    return "setup";
  }

  if (input.currentLevel !== "aal2") {
    return "verify";
  }

  return "allow";
}

/** @deprecated Prefer resolveAdminMfaGate — kept for challenge-only checks. */
export function adminNeedsMfaChallenge(input: {
  hasVerifiedTotp: boolean;
  currentLevel: string | null | undefined;
}): boolean {
  return resolveAdminMfaGate(input) === "verify";
}

export function adminNeedsMfaSetup(input: {
  hasVerifiedTotp: boolean;
  currentLevel?: string | null | undefined;
}): boolean {
  return resolveAdminMfaGate({
    hasVerifiedTotp: input.hasVerifiedTotp,
    currentLevel: input.currentLevel ?? null,
  }) === "setup";
}

function isAdminMfaFlowPath(pathname: string) {
  return (
    pathname === ADMIN_MFA_VERIFY_PATH ||
    pathname.startsWith(`${ADMIN_MFA_VERIFY_PATH}/`) ||
    pathname === ADMIN_MFA_SETUP_PATH ||
    pathname.startsWith(`${ADMIN_MFA_SETUP_PATH}/`)
  );
}

/**
 * Only allow relative admin / super-admin destinations after MFA.
 * Rejects protocol-relative and absolute URLs.
 */
export function isSafeAdminMfaNextPath(next: string): boolean {
  if (!next.startsWith("/") || next.startsWith("//")) {
    return false;
  }

  const pathname = next.split("?")[0] ?? "";

  if (isAdminMfaFlowPath(pathname)) {
    return false;
  }

  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === SUPER_ADMIN_PATH ||
    pathname.startsWith(`${SUPER_ADMIN_PATH}/`)
  );
}

export function sanitizeAdminMfaNextPath(
  next: string | null | undefined,
  fallback: string = SUPER_ADMIN_PATH,
): string {
  const candidate = next?.trim() ?? "";

  if (candidate && isSafeAdminMfaNextPath(candidate)) {
    return candidate;
  }

  if (isSafeAdminMfaNextPath(fallback)) {
    return fallback;
  }

  return SUPER_ADMIN_PATH;
}

export function buildAdminMfaVerifyPath(next?: string | null): string {
  const safeNext = next ? sanitizeAdminMfaNextPath(next) : null;

  if (!safeNext) {
    return ADMIN_MFA_VERIFY_PATH;
  }

  const params = new URLSearchParams({ next: safeNext });
  return `${ADMIN_MFA_VERIFY_PATH}?${params.toString()}`;
}

export function buildAdminMfaSetupPath(next?: string | null): string {
  const safeNext = next ? sanitizeAdminMfaNextPath(next) : null;

  if (!safeNext) {
    return ADMIN_MFA_SETUP_PATH;
  }

  const params = new URLSearchParams({ next: safeNext });
  return `${ADMIN_MFA_SETUP_PATH}?${params.toString()}`;
}

/** Destination for the current MFA gate decision (null when access is allowed). */
export function buildAdminMfaGateRedirectPath(
  decision: AdminMfaGateDecision,
  next?: string | null,
): string | null {
  if (decision === "allow") {
    return null;
  }

  if (decision === "setup") {
    return buildAdminMfaSetupPath(next);
  }

  return buildAdminMfaVerifyPath(next);
}

export function normalizeTotpCode(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

export function isValidTotpCode(code: string): boolean {
  return /^\d{6}$/.test(normalizeTotpCode(code));
}
