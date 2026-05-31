import type { Metadata } from "next";
import { InstructorMyClassesView } from "@/components/instructor/instructor-my-classes-view";
import { InstructorPortalHeader } from "@/components/instructor/instructor-portal-header";
import { getInstructorMyClassesPageData } from "@/lib/instructor-portal.server";

export const dynamic = "force-dynamic";

interface InstructorMyClassesPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: InstructorMyClassesPageProps): Promise<Metadata> {
  const pageData = await getInstructorMyClassesPageData(params.slug);

  return {
    title: `DojoDirector | My Classes | ${pageData.identity.displayName}`,
    description: "View assigned recurring classes and upcoming sessions.",
  };
}

export default async function InstructorMyClassesPage({
  params,
}: InstructorMyClassesPageProps) {
  const pageData = await getInstructorMyClassesPageData(params.slug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <InstructorPortalHeader
        slug={pageData.identity.slug}
        instructorName={pageData.identity.displayName}
        pageTitle="My Classes"
        showBackLink
      />

      <p className="text-sm text-dojo-muted">
        Your recurring class assignments and upcoming sessions you are teaching
        over the next 8 weeks, including session cover where assigned.
      </p>

      <InstructorMyClassesView
        recurringClasses={pageData.recurringClasses}
        upcomingSessions={pageData.upcomingSessions}
      />
    </main>
  );
}
