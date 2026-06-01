import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { InstructorClassAssignmentsManager } from "@/components/admin/instructor-class-assignments-manager";
import { AppHeader } from "@/components/layout/app-header";
import { getInstructorClassAssignmentsPageData } from "@/lib/admin-instructors.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubInstructorClassesPageProps {
  params: { clubSlug: string };
  searchParams: { instructorId?: string };
}

export async function generateMetadata({
  params,
}: ClubInstructorClassesPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Instructor class allocation`,
    description: `Assign instructors to recurring classes for ${club.name}.`,
  };
}

export default async function ClubInstructorClassesPage({
  params,
  searchParams,
}: ClubInstructorClassesPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const pageData = await getInstructorClassAssignmentsPageData(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Instructor Class Allocation" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "instructors")} className={adminNavLinkClassName}>
          ← Back to Instructors
        </Link>
      </AdminNavLinks>

      <InstructorClassAssignmentsManager
        clubSlug={club.slug}
        pageData={pageData}
        initialInstructorId={searchParams.instructorId ?? ""}
      />
    </main>
  );
}
