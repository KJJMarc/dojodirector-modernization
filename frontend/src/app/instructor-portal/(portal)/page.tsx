import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorPortalAcademySelector } from "@/components/instructor-portal/instructor-portal-academy-selector";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { InstructorPortalSignOutButton } from "@/components/instructor-portal/instructor-portal-sign-out-button";
import { InstructorPortalUnlinkedProfile } from "@/components/instructor-portal/instructor-portal-unlinked-profile";
import { resolveInstructorPortalClubContext } from "@/lib/instructor-portal-club.server";
import { resolveInstructorPortalSessionState } from "@/lib/instructor-portal-auth.server";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Instructor Portal",
  description: "Instructor portal for your academy.",
};

export default async function InstructorPortalEntryPage() {
  const session = await resolveInstructorPortalSessionState();

  if (session.status === "unlinked") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Instructor Portal" />

        <InstructorPortalHomeLink />

        <InstructorPortalUnlinkedProfile />
      </main>
    );
  }

  if (session.status !== "authenticated") {
    return null;
  }

  const { profile } = session;
  const clubContext = await resolveInstructorPortalClubContext(profile.userId);

  if (clubContext.accessibleClubs.length === 1 && clubContext.accessibleClubs[0]) {
    redirect(instructorPortalClubPath(clubContext.accessibleClubs[0].slug));
  }

  if (clubContext.requiresAcademySelection || clubContext.accessibleClubs.length > 1) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Instructor Portal" />

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

        <InstructorPortalAcademySelector clubs={clubContext.accessibleClubs} />
      </main>
    );
  }

  return null;
}
