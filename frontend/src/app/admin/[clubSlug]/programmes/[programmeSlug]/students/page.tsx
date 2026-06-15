import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { StudentSearchForm } from "@/components/admin/student-search-form";
import { StudentStatusFilter } from "@/components/admin/student-status-filter";
import { StudentsList } from "@/components/admin/students-list";
import { ProgrammeManagementUnavailableNotice } from "@/components/admin/programme-management-unavailable-notice";
import { AppHeader } from "@/components/layout/app-header";
import {
  clubProgrammeStudentAreasPath,
  formatProgrammeStudentsLabel,
  programmeStudentsNewAdminPath,
  BJJ_PROGRAMME_SLUG,
} from "@/lib/admin-programmes.shared";
import {
  getProgrammesSchemaAvailable,
  requireClubProgrammeBySlug,
} from "@/lib/admin-programmes.server";
import {
  filterAdminStudents,
  parseAdminStudentSort,
  parseAdminStudentStatusFilter,
  sortAdminStudents,
} from "@/lib/admin-students";
import { getClubStudents } from "@/lib/admin-students.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ProgrammeStudentsPageProps {
  params: { clubSlug: string; programmeSlug: string };
  searchParams: { q?: string; sort?: string; dir?: string; status?: string };
}

export async function generateMetadata({
  params,
}: ProgrammeStudentsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  if (
    !(await getProgrammesSchemaAvailable()) &&
    params.programmeSlug !== BJJ_PROGRAMME_SLUG
  ) {
    return {
      title: `Dojo Director | ${club.name} Programme Students`,
      description: `View programme students for ${club.name}.`,
    };
  }

  const programme = await requireClubProgrammeBySlug(club.id, params.programmeSlug);
  const pageTitle = formatProgrammeStudentsLabel(programme);

  return {
    title: `Dojo Director | ${club.name} ${pageTitle}`,
    description: `View ${pageTitle.toLowerCase()} for ${club.name}.`,
  };
}

export default async function ProgrammeStudentsPage({
  params,
  searchParams,
}: ProgrammeStudentsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const programmesSchemaAvailable = await getProgrammesSchemaAvailable();

  if (!programmesSchemaAvailable && params.programmeSlug !== BJJ_PROGRAMME_SLUG) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Programme Students" clubName={club.name} />

        <AdminNavLinks>
          <AdminBackLink clubSlug={club.slug} />
          <Link
            href={clubProgrammeStudentAreasPath(club.slug)}
            className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
          >
            ← Back to Student Area
          </Link>
        </AdminNavLinks>

        <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <ProgrammeManagementUnavailableNotice />
        </section>
      </main>
    );
  }

  const programme = await requireClubProgrammeBySlug(club.id, params.programmeSlug);
  const pageTitle = formatProgrammeStudentsLabel(programme);
  const searchQuery = searchParams.q?.trim();
  const statusFilter = searchParams.status
    ? parseAdminStudentStatusFilter(searchParams.status)
    : "active";
  const currentSort = parseAdminStudentSort(
    searchParams.sort,
    searchParams.dir,
  );
  const allStudents = await getClubStudents(club.id, programme, statusFilter);
  const students = sortAdminStudents(
    filterAdminStudents(allStudents, searchQuery),
    currentSort,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle={pageTitle} clubName={club.name} />

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
        {programmesSchemaAvailable ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={programmeStudentsNewAdminPath(club.slug, programme.slug)}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
            >
              Add Student
            </Link>
          </div>
        ) : null}
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            FIND MEMBERS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Search by first name, last name or email.
          </p>
        </div>
        <StudentStatusFilter
          clubSlug={club.slug}
          currentFilter={statusFilter}
          currentSort={currentSort}
          searchQuery={searchQuery}
          studentsPath={`programmes/${programme.slug}/students`}
        />
        <StudentSearchForm
          clubSlug={club.slug}
          initialQuery={searchQuery ?? ""}
          sortKey={currentSort.key}
          sortDir={currentSort.dir}
          statusFilter={statusFilter}
          studentsPath={`programmes/${programme.slug}/students`}
        />
      </section>

      <StudentsList
        clubSlug={club.slug}
        students={students}
        totalCount={allStudents.length}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        currentSort={currentSort}
        memberLabel="member"
        memberLabelPlural="members"
        listAriaLabel={`${pageTitle} list`}
        showBjjColumns={programme.beltsRanksEnabled}
        showAttendanceCard={programme.attendanceCardsEnabled}
        studentsPath={`programmes/${programme.slug}/students`}
        showProgrammeMembershipActions={false}
        programmeSlug={programme.slug}
        programmeName={programme.name}
      />
    </main>
  );
}
