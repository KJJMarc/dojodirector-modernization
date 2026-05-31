import type { Metadata } from "next";
import Link from "next/link";
import { StudentSearchForm } from "@/components/admin/student-search-form";
import { StudentsList } from "@/components/admin/students-list";
import { AppHeader } from "@/components/layout/app-header";
import {
  filterAdminStudents,
  parseAdminStudentSort,
  sortAdminStudents,
} from "@/lib/admin-students";
import { getClubStudents } from "@/lib/admin-students.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubAdminStudentsPageProps {
  params: { clubSlug: string };
  searchParams: { q?: string; sort?: string; dir?: string };
}

export async function generateMetadata({
  params,
}: ClubAdminStudentsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Students`,
    description: `View students for ${club.name}.`,
  };
}

export default async function ClubAdminStudentsPage({
  params,
  searchParams,
}: ClubAdminStudentsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const searchQuery = searchParams.q?.trim();
  const currentSort = parseAdminStudentSort(
    searchParams.sort,
    searchParams.dir,
  );
  const allStudents = await getClubStudents(club.id);
  const students = sortAdminStudents(
    filterAdminStudents(allStudents, searchQuery),
    currentSort,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Students" clubName={club.name} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={clubAdminPath(club.slug)}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to Admin Dashboard
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={clubAdminPath(club.slug, "students/promotion-candidates")}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
          >
            Promotion Candidates
          </Link>
          <Link
            href={clubAdminPath(club.slug, "students/new")}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
          >
            Add Student
          </Link>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            FIND STUDENTS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Search by first name, last name or email.
          </p>
        </div>
        <StudentSearchForm
          clubSlug={club.slug}
          initialQuery={searchQuery ?? ""}
          sortKey={currentSort.key}
          sortDir={currentSort.dir}
        />
      </section>

      <StudentsList
        clubSlug={club.slug}
        students={students}
        totalCount={allStudents.length}
        searchQuery={searchQuery}
        currentSort={currentSort}
      />
    </main>
  );
}
