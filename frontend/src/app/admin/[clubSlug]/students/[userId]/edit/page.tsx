import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditStudentForm } from "@/components/admin/edit-student-form";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminStudentEditPageData } from "@/lib/admin-edit-student.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubEditStudentPageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({
  params,
}: ClubEditStudentPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Edit Student`,
    description: `Edit student details for ${club.name}.`,
  };
}

export default async function ClubEditStudentPage({ params }: ClubEditStudentPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData;

  try {
    pageData = await getAdminStudentEditPageData(params.userId, club.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  const profilePath = clubAdminPath(club.slug, `students/${params.userId}/profile`);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Edit Student" clubName={club.name} />

      <Link
        href={profilePath}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Student Profile
      </Link>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            STUDENT DETAILS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Update contact information and club membership for this student.
          </p>
        </div>

        <EditStudentForm
          clubSlug={club.slug}
          pageData={pageData}
          cancelHref={profilePath}
        />
      </section>
    </main>
  );
}
