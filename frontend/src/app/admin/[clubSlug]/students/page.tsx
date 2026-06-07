import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { StudentSearchForm } from "@/components/admin/student-search-form";
import { StudentStatusFilter } from "@/components/admin/student-status-filter";
import { StudentsList } from "@/components/admin/students-list";
import { AppHeader } from "@/components/layout/app-header";
import { clubProgrammeStudentAreasPath } from "@/lib/admin-programmes.shared";
import { requireClubBjjProgramme } from "@/lib/admin-programmes.server";
import {
  filterAdminStudents,
  parseAdminStudentSort,
  parseAdminStudentStatusFilter,
  sortAdminStudents,
} from "@/lib/admin-students";
import { getBjjProgrammeStudents } from "@/lib/admin-students.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubAdminStudentsPageProps {
  params: { clubSlug: string };
  searchParams: {
    q?: string;
    sort?: string;
    dir?: string;
    status?: string;
    deleted?: string;
  };
}

export async function generateMetadata({
  params,
}: ClubAdminStudentsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} BJJ Students`,
    description: `View BJJ students for ${club.name}.`,
  };
}

export default async function ClubAdminStudentsPage({
  params,
  searchParams,
}: ClubAdminStudentsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const bjjProgramme = await requireClubBjjProgramme(club.id);
  const searchQuery = searchParams.q?.trim();
  const statusFilter = parseAdminStudentStatusFilter(searchParams.status);
  const currentSort = parseAdminStudentSort(
    searchParams.sort,
    searchParams.dir,
  );
  const allStudents = await getBjjProgrammeStudents(club.id, statusFilter);
  const students = sortAdminStudents(
    filterAdminStudents(allStudents, searchQuery),
    currentSort,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="BJJ Students" clubName={club.name} />

      {searchParams.deleted === "1" ? (
        <p
          className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-dojo-white"
          role="status"
        >
          Student deleted successfully.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminNavLinks>
          <AdminBackLink clubSlug={club.slug} />
          <Link
            href={clubProgrammeStudentAreasPath(club.slug)}
            className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
          >
            ← Back to Student Area
          </Link>
        </AdminNavLinks>
        <div className="flex flex-wrap gap-2">
          {bjjProgramme.promotionCandidatesEnabled ? (
            <Link
              href={clubAdminPath(club.slug, "students/promotion-candidates")}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
            >
              Promotion Candidates
            </Link>
          ) : null}
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
            FIND BJJ STUDENTS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Search by first name, last name or email. Attendance and grading on
            this list are scoped to Brazilian Jiu Jitsu classes.
          </p>
        </div>
        <StudentStatusFilter
          clubSlug={club.slug}
          currentFilter={statusFilter}
          currentSort={currentSort}
          searchQuery={searchQuery}
        />
        <StudentSearchForm
          clubSlug={club.slug}
          initialQuery={searchQuery ?? ""}
          sortKey={currentSort.key}
          sortDir={currentSort.dir}
          statusFilter={statusFilter}
        />
      </section>

      <StudentsList
        clubSlug={club.slug}
        students={students}
        totalCount={allStudents.length}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        currentSort={currentSort}
        memberLabel="BJJ student"
        memberLabelPlural="BJJ students"
        listAriaLabel="BJJ Students list"
        showAttendanceCard={bjjProgramme.attendanceCardsEnabled}
      />
    </main>
  );
}
