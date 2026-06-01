import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { notFound } from "next/navigation";
import { StudentProfileView } from "@/components/admin/student-profile-view";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminStudentProfilePageData } from "@/lib/admin-student-profile.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubStudentProfilePageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({
  params,
}: ClubStudentProfilePageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Student Profile`,
    description: `View student profile for ${club.name}.`,
  };
}

export default async function ClubStudentProfilePage({
  params,
}: ClubStudentProfilePageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData;

  try {
    pageData = await getAdminStudentProfilePageData(params.userId, club.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-2 px-3 py-3 pb-20 sm:px-5">
      <AppHeader pageTitle="Student Profile" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "students")} className={adminNavLinkClassName}>
          ← Back to BJJ Students
        </Link>
      </AdminNavLinks>

      <StudentProfileView clubSlug={club.slug} pageData={pageData} />
    </main>
  );
}
