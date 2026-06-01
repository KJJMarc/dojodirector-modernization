import type { Metadata } from "next";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { StudentRetentionTable } from "@/components/admin/student-retention-table";
import { AppHeader } from "@/components/layout/app-header";
import { loadAdminStudentRetentionRows } from "@/lib/admin-student-retention.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface StudentRetentionPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: StudentRetentionPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Student Retention`,
    description: `Identify students at risk of leaving for ${club.name}.`,
  };
}

export default async function StudentRetentionPage({
  params,
}: StudentRetentionPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const rows = await loadAdminStudentRetentionRows(club.id, club.slug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Student Retention" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          At-risk students
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-dojo-muted">
          Rule-based retention scores from attendance, bookings, membership status,
          and grading history. Sorted by highest risk first. Read-only — no messages
          are sent from this page.
        </p>
      </section>

      <StudentRetentionTable rows={rows} />
    </main>
  );
}
