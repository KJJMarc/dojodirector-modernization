import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { StudentOfTheYearEditForm } from "@/components/admin/student-of-the-year-edit-form";
import { AppHeader } from "@/components/layout/app-header";
import {
  clubAcademyPagesAdminPath,
  getAcademyPublicPageById,
} from "@/lib/admin-academy-pages.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";
import {
  loadStudentOfTheYearAdminEditState,
  STUDENT_OF_THE_YEAR_NOT_CONFIGURED_MESSAGE,
} from "@/lib/student-of-the-year.server";
import { STUDENT_OF_THE_YEAR_PAGE_ID } from "@/lib/student-of-the-year.shared";

export const dynamic = "force-dynamic";

interface StudentOfTheYearEditPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: StudentOfTheYearEditPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Student of the Year`,
    description: `Edit Student of the Year winners for ${club.name}.`,
  };
}

export default async function StudentOfTheYearEditPage({
  params,
}: StudentOfTheYearEditPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  if (club.slug !== KINGSTON_CLUB_SLUG) {
    notFound();
  }

  const page = getAcademyPublicPageById(STUDENT_OF_THE_YEAR_PAGE_ID);

  if (!page) {
    notFound();
  }

  const editState = await loadStudentOfTheYearAdminEditState(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Student of the Year" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAcademyPagesAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Academy Pages
        </Link>
      </AdminNavLinks>

      {!editState.tableAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {STUDENT_OF_THE_YEAR_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <StudentOfTheYearEditForm clubSlug={club.slug} state={editState} />
        </section>
      )}
    </main>
  );
}
