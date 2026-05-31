import Link from "next/link";
import { InstructorPortalLoginForm } from "@/components/instructor-portal/instructor-portal-login-form";

export function InstructorPortalLoginScreen() {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">Instructor sign-in</h2>
        <p className="mt-2 text-sm text-dojo-muted">
          Sign in with the email address your club set up for instructor portal access.
        </p>
      </div>

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
