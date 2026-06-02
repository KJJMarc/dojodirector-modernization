import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { InstructorMyClassesView } from "@/components/instructor/instructor-my-classes-view";
import { InstructorPortalBackLink } from "@/components/instructor-portal/instructor-portal-back-link";
import { InstructorPortalHomeLink } from "@/components/instructor-portal/instructor-portal-home-link";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";
import { getInstructorMyClassesPageData } from "@/lib/instructor-portal.server";
import { formatInstructorSlugFromName } from "@/lib/instructor-portal.shared";

export const dynamic = "force-dynamic";

interface InstructorMyClassesPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: InstructorMyClassesPageProps): Promise<Metadata> {
  const { profile, club } = await requireInstructorPortalPageContext(params.clubSlug);
  const instructorSlug = formatInstructorSlugFromName(profile.fullName);
  const pageData = await getInstructorMyClassesPageData(instructorSlug, club.id);

  return {
    title: `DojoDirector | My Classes | ${pageData.identity.displayName}`,
    description: "View assigned recurring classes and upcoming sessions.",
  };
}

export default async function InstructorMyClassesPage({
  params,
}: InstructorMyClassesPageProps) {
  const { profile, club } = await requireInstructorPortalPageContext(params.clubSlug);
  const instructorSlug = formatInstructorSlugFromName(profile.fullName);
  const pageData = await getInstructorMyClassesPageData(instructorSlug, club.id);

  if (pageData.identity.slug !== instructorSlug) {
    redirect(`/instructor-portal/${club.slug}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="My Classes" clubName={club.name} />

      <InstructorPortalBackLink clubSlug={club.slug} />

      <p className="text-sm text-dojo-muted">
        Your recurring class assignments and upcoming sessions you are teaching
        over the next 8 weeks, including session cover where assigned.
      </p>

      <InstructorMyClassesView
        recurringClasses={pageData.recurringClasses}
        upcomingSessions={pageData.upcomingSessions}
      />

      <InstructorPortalHomeLink clubSlug={club.slug} />
    </main>
  );
}
