import Link from "next/link";
import {
  forgotPasswordPath,
  type PasswordResetLoginContext,
} from "@/lib/password-reset.shared";

interface LoginForgotPasswordLinkProps {
  context: PasswordResetLoginContext;
}

export function LoginForgotPasswordLink({ context }: LoginForgotPasswordLinkProps) {
  return (
    <p className="text-right">
      <Link
        href={forgotPasswordPath(context)}
        className="text-xs font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        Forgot password?
      </Link>
    </p>
  );
}
