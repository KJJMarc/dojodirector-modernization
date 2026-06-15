import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import {
  loginPathForPasswordResetContext,
  type PasswordResetLoginContext,
} from "@/lib/password-reset.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Forgot Password",
  description: "Request a password reset link.",
  robots: { index: false, follow: false },
};

interface ForgotPasswordPageProps {
  searchParams: { context?: string };
}

function parseContext(value: string | undefined): PasswordResetLoginContext | null {
  if (
    value === "admin" ||
    value === "super_admin" ||
    value === "instructor" ||
    value === "student"
  ) {
    return value;
  }

  return null;
}

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const context = parseContext(searchParams.context);
  const loginPath = loginPathForPasswordResetContext(context);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-dojo-border bg-dojo-surface p-6 shadow-lg shadow-black/30 sm:p-8">
        <DojoDirectorWordmark className="text-xs font-semibold uppercase tracking-[0.18em]" />
        <h1 className="mt-3 text-2xl font-semibold text-dojo-white">Forgot password</h1>
        <p className="mt-2 text-sm text-dojo-muted">
          Enter the email you use to sign in. We will send a reset link if an account exists.
        </p>

        <div className="mt-6">
          <ForgotPasswordForm loginPath={loginPath} />
        </div>
      </div>
    </main>
  );
}
