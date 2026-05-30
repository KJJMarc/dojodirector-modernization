import type { Metadata } from "next";
import { InstructorSessionAssignmentsList } from "@/components/admin/instructor-session-assignments-list";
import { AppHeader } from "@/components/layout/app-header";
import { getInstructorSessionAssignmentsPageData } from "@/lib/admin-instructors.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubInstructorSessionsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubInstructorSessionsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Session cover`,
    description: `Replace instructors for individual class sessions at ${club.name}.`,
  };
}

export default async function ClubInstructorSessionsPage({
  params,
}: ClubInstructorSessionsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const pageData = await getInstructorSessionAssignmentsPageData();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Session cover" clubName={club.name} />

      <p className="text-sm text-dojo-muted">
        Upcoming class sessions for the next 8 weeks. Replace the instructor for
        one class only — for holiday cover, sickness, or a visiting instructor —
        without changing recurring allocations or other dates.
      </p>

      <InstructorSessionAssignmentsList clubSlug={club.slug} pageData={pageData} />
    </main>
  );
}
