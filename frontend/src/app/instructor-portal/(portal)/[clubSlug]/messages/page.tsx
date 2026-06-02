import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorPortalBackLink } from "@/components/instructor-portal/instructor-portal-back-link";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { InstructorPortalSwitchAcademyButton } from "@/components/instructor-portal/instructor-portal-switch-academy-button";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Instructor Messages",
  description: "Instructor portal messages.",
};

interface InstructorPortalMessagesPageProps {
  params: { clubSlug: string };
}

export default async function InstructorPortalMessagesPage({
  params,
}: InstructorPortalMessagesPageProps) {
  const { profile, club, clubContext } = await requireInstructorPortalPageContext(
    params.clubSlug,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Messages" clubName={club.name} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <InstructorPortalBackLink clubSlug={club.slug} />
        <div className="flex flex-wrap items-center gap-2">
          {clubContext.accessibleClubs.length > 1 ? (
            <InstructorPortalSwitchAcademyButton />
          ) : null}
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center">
        <h2 className="text-xl font-semibold text-dojo-white">Messages</h2>
        <p className="text-sm text-dojo-muted">Coming soon</p>
        <p className="text-xs text-dojo-muted">Signed in as {profile.fullName}</p>
      </section>

      <InstructorPortalHomeLink clubSlug={club.slug} />
    </main>
  );
}
