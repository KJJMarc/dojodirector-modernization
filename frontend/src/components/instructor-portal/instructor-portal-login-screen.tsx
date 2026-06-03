import Link from "next/link";
import { InstructorPortalLoginForm } from "@/components/instructor-portal/instructor-portal-login-form";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/password-reset.shared";
import { PORTAL_SETUP_SUCCESS_MESSAGE } from "@/lib/portal-setup.shared";

interface InstructorPortalLoginScreenProps {
  showResetSuccessMessage?: boolean;
  showSetupSuccessMessage?: boolean;
}

export function InstructorPortalLoginScreen({
  showResetSuccessMessage = false,
  showSetupSuccessMessage = false,
}: InstructorPortalLoginScreenProps) {
  const successMessage = showSetupSuccessMessage
    ? PORTAL_SETUP_SUCCESS_MESSAGE
    : showResetSuccessMessage
      ? PASSWORD_RESET_SUCCESS_MESSAGE
      : null;
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">Instructor sign-in</h2>
        <p className="mt-2 text-sm text-dojo-muted">
          Sign in with the email address your club set up for instructor portal access.
        </p>
      </div>

      {successMessage ? (
        <p
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      <InstructorPortalLoginForm />

      <p className="text-center text-xs text-dojo-muted">
        Member portal?{" "}
        <Link href="/student-portal/login" className="text-dojo-white hover:underline">
          Student login
        </Link>
      </p>
    </section>
  );
}
