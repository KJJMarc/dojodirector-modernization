import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { InstructorSessionAssignmentsList } from "@/components/admin/instructor-session-assignments-list";
import { AppHeader } from "@/components/layout/app-header";
import { getInstructorSessionAssignmentsPageData } from "@/lib/admin-instructors.server";
import { clubAdminPath } from "@/lib/clubs.shared";
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
    title: `Dojo Director | ${club.name} Session Cover`,
    description: `Replace instructors for individual class sessions at ${club.name}.`,
  };
}

export default async function ClubInstructorSessionsPage({
  params,
}: ClubInstructorSessionsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const pageData = await getInstructorSessionAssignmentsPageData(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Session Cover" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "instructors")} className={adminNavLinkClassName}>
          ← Back to Instructors
        </Link>
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        Upcoming class sessions for the next 8 weeks. Replace the instructor for
        one class only — for holiday cover, sickness, or a visiting instructor —
        without changing recurring allocations or other dates.
      </p>

      <InstructorSessionAssignmentsList clubSlug={club.slug} pageData={pageData} />
    </main>
  );
}
