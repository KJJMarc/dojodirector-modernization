import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLinkConfirmLanding } from "@/components/auth/auth-link-confirm-landing";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import {
  buildAuthConfirmRedirectPath,
  loginPathForPasswordResetContext,
} from "@/lib/password-reset.shared";
import {
  buildPortalSetupResetPath,
  parsePortalSetupLoginContext,
} from "@/lib/portal-setup.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Set Up Account",
  description: "Finish setting up your Dojo Director login.",
  robots: { index: false, follow: false },
};

interface SetupPasswordPageProps {
  searchParams: {
    context?: string;
    error?: string;
    token_hash?: string;
    type?: string;
    next?: string;
    setup?: string;
  };
}

export default function SetupPasswordPage({ searchParams }: SetupPasswordPageProps) {
  const context = parsePortalSetupLoginContext(searchParams.context);
  const loginPath = loginPathForPasswordResetContext(context);
  const resetPath = context
    ? buildPortalSetupResetPath(context)
    : "/reset-password?setup=1";
  const nextPath = searchParams.next?.trim() || resetPath;

  if (searchParams.token_hash && searchParams.type === "recovery") {
    const confirmPath = buildAuthConfirmRedirectPath(
      searchParams.token_hash,
      nextPath,
    );

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-dojo-border bg-dojo-surface p-6 shadow-lg shadow-black/30 sm:p-8">
          <DojoDirectorWordmark className="text-xs font-semibold uppercase tracking-[0.18em]" />
          <h1 className="mt-3 text-2xl font-semibold text-dojo-white">
            Set up your account
          </h1>
          <div className="mt-6">
            <AuthLinkConfirmLanding
              confirmPath={confirmPath}
              title="Set up your account"
              description="Tap the button below to open your secure setup link. This extra step keeps automated email scanners from invalidating your link before you use it."
              buttonLabel="Continue to account setup"
              loginPath={loginPath}
            />
          </div>
        </div>
      </main>
    );
  }

  const params = new URLSearchParams();
  params.set("setup", "1");

  if (context) {
    params.set("context", context);
  }

  if (searchParams.error) {
    params.set("error", searchParams.error);
  }

  redirect(`/reset-password?${params.toString()}`);
}
