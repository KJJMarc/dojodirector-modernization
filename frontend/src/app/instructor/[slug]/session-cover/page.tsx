import type { Metadata } from "next";
import { InstructorPortalHeader } from "@/components/instructor/instructor-portal-header";
import { InstructorSessionCoverList } from "@/components/instructor/instructor-session-cover-list";
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
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <InstructorPortalHeader
        slug={pageData.identity.slug}
        instructorName={pageData.identity.displayName}
        pageTitle="Session Cover"
        showBackLink
      />

      <p className="text-sm text-dojo-muted">
        Upcoming class sessions for the next 8 weeks. Read-only view of who is
        teaching each class.
      </p>

      <InstructorSessionCoverList sessions={pageData.sessions} />
    </main>
  );
}
