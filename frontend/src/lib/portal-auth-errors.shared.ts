export const PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE =
  "Invalid email or password.";

export const PORTAL_AUTH_NO_ACCESS_MESSAGE =
  "You do not currently have access to this portal. Please contact your academy administrator.";

export const PORTAL_AUTH_EXPIRED_LINK_MESSAGE =
  "This link has expired. Please request a new one.";

export const PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE =
  "Sorry, something went wrong. Please try again shortly.";

export const PORTAL_AUTH_MISSING_CREDENTIALS_MESSAGE =
  "Enter your email and password.";

/** Legacy and validation messages that may be thrown intentionally. */
export const USER_FACING_PORTAL_AUTH_MESSAGES = new Set<string>([
  PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE,
  PORTAL_AUTH_NO_ACCESS_MESSAGE,
  PORTAL_AUTH_EXPIRED_LINK_MESSAGE,
  PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE,
  PORTAL_AUTH_MISSING_CREDENTIALS_MESSAGE,
  "Club is required.",
  "Password must be at least 8 characters.",
  "Passwords do not match.",
  // Legacy login copy (mapped at source over time; still pass through).
  "Sign in failed. Check your email and password.",
  "You do not have permission to access the admin area.",
  "This account does not have student portal access. The member portal is for students with an active academy membership.",
  "You do not have student portal access for this academy. Sign in with a student account or contact the academy for assistance.",
  "You do not have instructor access to that academy.",
]);

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  return "";
}

function includesAny(haystack: string, needles: string[]) {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function isInvalidCredentialsMessage(message: string) {
  return includesAny(message, [
    "sign in failed",
    "invalid login credentials",
    "invalid email or password",
    "invalid credentials",
    "email not confirmed",
    "wrong password",
  ]);
}

function isNoPortalAccessMessage(message: string) {
  return includesAny(message, [
    "do not have permission to access the admin",
    "do not currently have access to this portal",
    "does not have student portal access",
    "do not have student portal access",
    "do not have instructor access",
    "student_portal_club_access_denied",
  ]);
}

function isExpiredLinkMessage(message: string) {
  return includesAny(message, [
    "link has expired",
    "link is invalid or has expired",
    "invalid or has expired",
    "otp expired",
    "flow_state_expired",
    "token has expired",
    "recovery token",
    "email link is invalid",
  ]);
}

function isFrameworkOrInfrastructureMessage(message: string) {
  return includesAny(message, [
    "an error occurred in the server components render",
    "server components render",
    "digest",
    "failed to load",
    "failed to look up",
    "failed to create",
    "failed to update",
    "failed to activate",
    "unable to load auth session",
    "network",
    "fetch failed",
    "internal server error",
  ]);
}

export function isUserFacingPortalAuthMessage(message: string) {
  return USER_FACING_PORTAL_AUTH_MESSAGES.has(message.trim());
}

/** Map auth errors to safe user-facing copy without leaking framework or database details. */
export function mapPortalAuthError(error: unknown): string {
  const message = normalizeErrorMessage(error);

  if (message && isUserFacingPortalAuthMessage(message)) {
    if (
      message === "Sign in failed. Check your email and password." ||
      isInvalidCredentialsMessage(message)
    ) {
      return PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE;
    }

    if (isNoPortalAccessMessage(message)) {
      return PORTAL_AUTH_NO_ACCESS_MESSAGE;
    }

    if (isExpiredLinkMessage(message)) {
      return PORTAL_AUTH_EXPIRED_LINK_MESSAGE;
    }

    return message;
  }

  if (!message || isFrameworkOrInfrastructureMessage(message)) {
    return PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE;
  }

  if (isInvalidCredentialsMessage(message)) {
    return PORTAL_AUTH_INVALID_CREDENTIALS_MESSAGE;
  }

  if (isNoPortalAccessMessage(message)) {
    return PORTAL_AUTH_NO_ACCESS_MESSAGE;
  }

  if (isExpiredLinkMessage(message)) {
    return PORTAL_AUTH_EXPIRED_LINK_MESSAGE;
  }

  return PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE;
}
