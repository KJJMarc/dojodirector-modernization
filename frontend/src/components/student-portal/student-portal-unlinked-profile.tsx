import { StudentPortalSignOutButton } from "@/components/student-portal/student-portal-sign-out-button";

export function StudentPortalUnlinkedProfile() {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">Account not linked</h2>
        <p className="mt-2 text-sm leading-relaxed text-dojo-muted">
          No student profile is linked to this login yet. Contact your club to link
          your account, or sign out and try a different email.
        </p>
      </div>

      <StudentPortalSignOutButton />
    </section>
  );
}
