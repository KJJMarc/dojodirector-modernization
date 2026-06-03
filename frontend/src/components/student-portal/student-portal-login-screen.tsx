import Link from "next/link";
import { StudentPortalLoginForm } from "@/components/student-portal/student-portal-login-form";
import { isStudentPortalDevPickerEnabled } from "@/lib/student-portal-auth.shared";
import { PASSWORD_RESET_SUCCESS_MESSAGE } from "@/lib/password-reset.shared";
import { PORTAL_SETUP_SUCCESS_MESSAGE } from "@/lib/portal-setup.shared";

interface StudentPortalLoginScreenProps {
  showResetSuccessMessage?: boolean;
  showSetupSuccessMessage?: boolean;
}

export function StudentPortalLoginScreen({
  showResetSuccessMessage = false,
  showSetupSuccessMessage = false,
}: StudentPortalLoginScreenProps) {
  const successMessage = showSetupSuccessMessage
    ? PORTAL_SETUP_SUCCESS_MESSAGE
    : showResetSuccessMessage
      ? PASSWORD_RESET_SUCCESS_MESSAGE
      : null;
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">Member sign-in</h2>
        <p className="mt-2 text-sm text-dojo-muted">
          Sign in with the email address your club invited you to use.
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

      <StudentPortalLoginForm />

      <p className="text-center text-xs text-dojo-muted">
        Instructor portal?{" "}
        <Link href="/instructor-portal/login" className="text-dojo-white hover:underline">
          Instructor login
        </Link>
      </p>

      {isStudentPortalDevPickerEnabled() ? (
        <p className="text-center text-xs text-dojo-muted">
          Development access:{" "}
          <Link href="/student-portal/dev" className="text-dojo-white hover:underline">
            account picker
          </Link>
        </p>
      ) : null}
    </section>
  );
}
