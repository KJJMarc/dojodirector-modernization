import Link from "next/link";
import { StudentPortalLoginForm } from "@/components/student-portal/student-portal-login-form";
import { isStudentPortalDevPickerEnabled } from "@/lib/student-portal-auth.shared";

export function StudentPortalLoginScreen() {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">Member sign-in</h2>
        <p className="mt-2 text-sm text-dojo-muted">
          Sign in with the email address your club invited you to use.
        </p>
      </div>

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
