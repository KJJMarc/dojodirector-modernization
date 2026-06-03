import { AdminAccessLoginForm } from "@/components/admin/admin-access-login-form";
import { DojoDirectorWordmark } from "@/components/layout/dojo-director-wordmark";
import { ADMIN_ACCESS_DENIED_MESSAGE } from "@/lib/admin-auth.shared";
import type { AdminLoginIntent } from "@/lib/admin-auth.shared";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/password-reset.shared";
import { PORTAL_SETUP_SUCCESS_MESSAGE } from "@/lib/portal-setup.shared";

interface AdminAccessLoginScreenProps {
  heading: string;
  loginIntent: AdminLoginIntent;
  showDeniedMessage?: boolean;
  showResetSuccessMessage?: boolean;
  showSetupSuccessMessage?: boolean;
  clubSlug?: string;
  signInAction: (formData: FormData) => Promise<void>;
}

export function AdminAccessLoginScreen({
  heading,
  loginIntent,
  showDeniedMessage = false,
  showResetSuccessMessage = false,
  showSetupSuccessMessage = false,
  clubSlug,
  signInAction,
}: AdminAccessLoginScreenProps) {
  const successMessage = showSetupSuccessMessage
    ? PORTAL_SETUP_SUCCESS_MESSAGE
    : showResetSuccessMessage
      ? PASSWORD_RESET_SUCCESS_MESSAGE
      : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-dojo-border bg-dojo-surface p-6 shadow-lg shadow-black/30 sm:p-8">
        <DojoDirectorWordmark className="text-xs font-semibold uppercase tracking-[0.18em]" />
        <h1 className="mt-3 text-2xl font-semibold text-dojo-white">{heading}</h1>

        {successMessage ? (
          <p
            className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}

        {showDeniedMessage ? (
          <p className="mt-4 rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
            {ADMIN_ACCESS_DENIED_MESSAGE}
          </p>
        ) : null}

        <div className="mt-6">
          <AdminAccessLoginForm
            loginIntent={loginIntent}
            clubSlug={clubSlug}
            onSubmit={signInAction}
          />
        </div>
      </div>
    </main>
  );
}
