import type { Metadata } from "next";
import Link from "next/link";
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
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Student Profile" clubName={club.name} />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={clubAdminPath(club.slug, "students")}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to Students
        </Link>
      </div>

      <StudentProfileView clubSlug={club.slug} pageData={pageData} />
    </main>
  );
}
