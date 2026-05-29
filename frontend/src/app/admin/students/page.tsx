import type { Metadata } from "next";
import Link from "next/link";
import { StudentSearchForm } from "@/components/admin/student-search-form";
import { StudentsList } from "@/components/admin/students-list";
import { AppHeader } from "@/components/layout/app-header";
import {
  filterAdminStudents,
  getClubStudents,
} from "@/lib/admin-students";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Students",
  description: "View students for Kingston Jiu Jitsu.",
};

interface AdminStudentsPageProps {
  searchParams: { q?: string };
}

export default async function AdminStudentsPage({
  searchParams,
}: AdminStudentsPageProps) {
  const searchQuery = searchParams.q?.trim();
  const allStudents = await getClubStudents();
  const students = filterAdminStudents(allStudents, searchQuery);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Students" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin"
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to admin
        </Link>
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Find students
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Search by first name, last name or email.
          </p>
        </div>
        <StudentSearchForm initialQuery={searchQuery ?? ""} />
      </section>

      <StudentsList
        students={students}
        totalCount={allStudents.length}
        searchQuery={searchQuery}
      />
    </main>
  );
}
