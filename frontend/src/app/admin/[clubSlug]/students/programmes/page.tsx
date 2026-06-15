import type { Metadata } from "next";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { ProgrammeStudentAreasCards } from "@/components/admin/programme-student-areas-cards";
import { AppHeader } from "@/components/layout/app-header";
import { loadClubProgrammes } from "@/lib/admin-programmes.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ProgrammeStudentAreasPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ProgrammeStudentAreasPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Students`,
    description: `Programme student areas for ${club.name}.`,
  };
}

export default async function ProgrammeStudentAreasPage({
  params,
}: ProgrammeStudentAreasPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const programmes = await loadClubProgrammes(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Students" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Programme student areas
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Choose a programme to view and manage its students.
          </p>
        </div>

        <ProgrammeStudentAreasCards clubSlug={club.slug} programmes={programmes} />
      </section>
    </main>
  );
}
