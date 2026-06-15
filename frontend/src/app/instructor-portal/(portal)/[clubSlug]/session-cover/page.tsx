import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorSessionCoverList } from "@/components/instructor/instructor-session-cover-list";
import { InstructorPortalBackLink } from "@/components/instructor-portal/instructor-portal-back-link";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";
import { getInstructorSessionCoverPageData } from "@/lib/instructor-portal.server";
import { formatInstructorSlugFromName } from "@/lib/instructor-portal.shared";

export const dynamic = "force-dynamic";

interface InstructorSessionCoverPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: InstructorSessionCoverPageProps): Promise<Metadata> {
  const { profile, club } = await requireInstructorPortalPageContext(params.clubSlug);
  const instructorSlug = formatInstructorSlugFromName(profile.fullName);
  const pageData = await getInstructorSessionCoverPageData(instructorSlug, club.id);

  return {
    title: `Dojo Director | Session Cover | ${pageData.identity.displayName}`,
    description: "View who is teaching upcoming classes.",
  };
}

export default async function InstructorSessionCoverPage({
  params,
}: InstructorSessionCoverPageProps) {
  const { profile, club } = await requireInstructorPortalPageContext(params.clubSlug);
  const instructorSlug = formatInstructorSlugFromName(profile.fullName);
  const pageData = await getInstructorSessionCoverPageData(instructorSlug, club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Session Cover" clubName={club.name} />

      <InstructorPortalBackLink clubSlug={club.slug} />

      <p className="text-sm text-dojo-muted">
        Upcoming class sessions for the next 8 weeks. Read-only view of who is
        teaching each class.
      </p>

      <InstructorSessionCoverList sessions={pageData.sessions} />

      <InstructorPortalHomeLink clubSlug={club.slug} />
    </main>
  );
}
