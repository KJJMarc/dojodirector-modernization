import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorQuickActions } from "@/components/instructor/instructor-quick-actions";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { InstructorPortalSignOutButton } from "@/components/instructor-portal/instructor-portal-sign-out-button";
import { InstructorPortalUnlinkedProfile } from "@/components/instructor-portal/instructor-portal-unlinked-profile";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { resolveInstructorPortalSessionState } from "@/lib/instructor-portal-auth.server";
import { formatInstructorSlugFromName } from "@/lib/instructor-portal.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Instructor Portal",
  description: "Instructor portal for Kingston Jiu Jitsu.",
};

export default async function InstructorPortalPage() {
  const session = await resolveInstructorPortalSessionState();

  if (session.status === "unlinked") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Instructor Portal" clubName={ACTIVE_CLUB_NAME} />

        <InstructorPortalHomeLink />

        <InstructorPortalUnlinkedProfile />
      </main>
    );
  }

  if (session.status !== "authenticated") {
    return null;
  }

  const { profile } = session;
  const instructorSlug = formatInstructorSlugFromName(profile.fullName);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Instructor Portal" clubName={ACTIVE_CLUB_NAME} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <InstructorPortalHomeLink />
        <InstructorPortalSignOutButton />
      </div>

      <section className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3">
        <p className="text-sm text-dojo-muted">
          Signed in as{" "}
          <span className="font-semibold text-dojo-white">{profile.fullName}</span>
        </p>
      </section>

      <InstructorQuickActions
        slug={instructorSlug}
        sectionTitle="QUICK ACTIONS"
        extraActions={[
          {
            label: "Messages",
            href: "/instructor-portal/messages",
            description: "Club messaging",
          },
        ]}
      />
    </main>
  );
}
