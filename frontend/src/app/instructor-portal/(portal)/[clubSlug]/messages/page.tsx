import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorPortalBackLink } from "@/components/instructor-portal/instructor-portal-back-link";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { InstructorPortalMessagesInbox } from "@/components/instructor-portal/instructor-portal-messages-inbox";
import { InstructorPortalSwitchAcademyButton } from "@/components/instructor-portal/instructor-portal-switch-academy-button";
import { listPortalMessagesForRecipient } from "@/lib/portal-messages.server";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dojo Director | Instructor Messages",
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

  const messages = await listPortalMessagesForRecipient({
    clubId: club.id,
    recipientUserId: profile.userId,
    recipientType: "instructor",
  });

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

      <InstructorPortalMessagesInbox clubSlug={club.slug} messages={messages} />

      <InstructorPortalHomeLink clubSlug={club.slug} />
    </main>
  );
}
