import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorSessionCoverList } from "@/components/instructor/instructor-session-cover-list";
import { InstructorPortalBackLink } from "@/components/instructor-portal/instructor-portal-back-link";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { getInstructorSessionCoverPageData } from "@/lib/instructor-portal.server";

export const dynamic = "force-dynamic";

interface InstructorSessionCoverPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: InstructorSessionCoverPageProps): Promise<Metadata> {
  const pageData = await getInstructorSessionCoverPageData(params.slug);

  return {
    title: `DojoDirector | Session Cover | ${pageData.identity.displayName}`,
    description: "View who is teaching upcoming classes.",
  };
}

export default async function InstructorSessionCoverPage({
  params,
}: InstructorSessionCoverPageProps) {
  const pageData = await getInstructorSessionCoverPageData(params.slug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Session Cover" clubName={ACTIVE_CLUB_NAME} />

      <InstructorPortalBackLink />

      <p className="text-sm text-dojo-muted">
        Upcoming class sessions for the next 8 weeks. Read-only view of who is
        teaching each class.
      </p>

      <InstructorSessionCoverList sessions={pageData.sessions} />

      <InstructorPortalHomeLink />
    </main>
  );
}
