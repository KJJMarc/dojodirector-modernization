import { adminLoginPath, superAdminLoginPath } from "@/lib/admin-auth.shared";
import { PORTAL_AUTH_EXPIRED_LINK_MESSAGE } from "@/lib/portal-auth-errors.shared";

export const PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export const PASSWORD_RESET_INVALID_LINK_MESSAGE = PORTAL_AUTH_EXPIRED_LINK_MESSAGE;

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Your password has been updated. You can sign in with your new password.";

export const PASSWORD_RESET_SUBJECT = "Reset your Dojo Director password";

export type PasswordResetLoginContext =
  | "admin"
  | "super_admin"
  | "instructor"
  | "student";

export function forgotPasswordPath(context?: PasswordResetLoginContext) {
  const base = "/forgot-password";

  if (!context) {
    return base;
  }

  return `${base}?context=${context}`;
}

export function resetPasswordPath() {
  return "/reset-password";
}

/** Internal path consumed after the user clicks through the email landing page. */
export function buildAuthConfirmRedirectPath(
  hashedToken: string,
  nextPath: string,
) {
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: "recovery",
    next: nextPath,
  });

  return `/auth/confirm?${params.toString()}`;
}

/**
 * Entry URL for custom Resend emails — lands on /reset-password with a click-through
 * step so mailbox link scanners do not consume the one-time OTP via GET /auth/confirm.
 */
export function buildPasswordResetConfirmUrl(
  siteOrigin: string,
  hashedToken: string,
  nextPath = "/reset-password",
) {
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: "recovery",
  });

  if (nextPath !== "/reset-password") {
    params.set("next", nextPath);
  }

  return `${siteOrigin.replace(/\/$/, "")}/reset-password?${params.toString()}`;
}

export function loginPathForPasswordResetContext(
  context: PasswordResetLoginContext | null | undefined,
) {
  switch (context) {
    case "super_admin":
      return superAdminLoginPath();
    case "admin":
      return adminLoginPath();
    case "instructor":
      return "/instructor-portal/login";
    case "student":
      return "/student-portal/login";
    default:
      return "/student-portal/login";
  }
}
