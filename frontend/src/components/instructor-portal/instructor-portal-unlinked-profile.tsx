import { InstructorPortalSignOutButton } from "@/components/instructor-portal/instructor-portal-sign-out-button";

export function InstructorPortalUnlinkedProfile() {
  return (
    <section className="space-y-4 rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 p-4">
      <h2 className="text-lg font-semibold text-dojo-white">Unable to open instructor portal</h2>
      <p className="text-sm text-dojo-muted">
        Your sign-in is active, but this account is not linked to instructor portal access
        yet. Ask your club admin to send an instructor portal invite from your profile, or
        confirm your role is instructor or admin.
      </p>
      <InstructorPortalSignOutButton />
    </section>
  );
}
