import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import {
  loginPathForPasswordResetContext,
  type PasswordResetLoginContext,
} from "@/lib/password-reset.shared";
import {
  isFirstTimePortalSetupSearchParam,
  parsePortalSetupLoginContext,
} from "@/lib/portal-setup.shared";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Reset Password",
  description: "Set a new password for your account.",
  robots: { index: false, follow: false },
};

interface ResetPasswordPageProps {
  searchParams: {
    error?: string;
    context?: string;
    setup?: string;
    token_hash?: string;
    type?: string;
  };
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const context = parsePortalSetupLoginContext(searchParams.context);
  const isFirstTimeSetup = isFirstTimePortalSetupSearchParam(searchParams.setup);
  const loginPath = loginPathForPasswordResetContext(context);

  if (searchParams.token_hash && searchParams.type === "recovery") {
    const nextParams = new URLSearchParams();

    if (isFirstTimeSetup) {
      nextParams.set("setup", "1");
    }

    if (context) {
      nextParams.set("context", context);
    }

    const nextPath = nextParams.toString()
      ? `/reset-password?${nextParams.toString()}`
      : "/reset-password";

    const params = new URLSearchParams();
    params.set("token_hash", searchParams.token_hash);
    params.set("type", searchParams.type);
    params.set("next", nextPath);

    redirect(`/auth/confirm?${params.toString()}`);
  }

  const supabase = await createSupabaseServerAuthClient();
  const [
    {
      data: { user },
    },
    {
      data: { session },
    },
  ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);

  const hasRecoverySession = Boolean(user ?? session);
  const showInvalidLink = searchParams.error === "invalid";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-dojo-border bg-dojo-surface p-6 shadow-lg shadow-black/30 sm:p-8">
        <DojoDirectorWordmark className="text-xs font-semibold uppercase tracking-[0.18em]" />
        <h1 className="mt-3 text-2xl font-semibold text-dojo-white">
          {isFirstTimeSetup ? "Set up your account" : "Reset password"}
        </h1>
        <p className="mt-2 text-sm text-dojo-muted">
          {isFirstTimeSetup
            ? "Choose a password to finish setting up your Dojo Director login."
            : "Choose a new password for your account."}
        </p>

        <div className="mt-6">
          <ResetPasswordForm
            loginPath={loginPath}
            context={context}
            isFirstTimeSetup={isFirstTimeSetup}
            hasRecoverySession={hasRecoverySession}
            showInvalidLink={showInvalidLink}
          />
        </div>
      </div>
    </main>
  );
}
