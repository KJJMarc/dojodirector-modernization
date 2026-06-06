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

/** Server-side confirm URL for custom Resend emails (uses hashed_token, not action_link). */
export function buildPasswordResetConfirmUrl(
  siteOrigin: string,
  hashedToken: string,
  nextPath = "/reset-password",
) {
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: "recovery",
    next: nextPath,
  });

  return `${siteOrigin.replace(/\/$/, "")}/auth/confirm?${params.toString()}`;
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
