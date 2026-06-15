import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { InstructorsList } from "@/components/admin/instructors-list";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminInstructors } from "@/lib/admin-instructors.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubAdminInstructorsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubAdminInstructorsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Instructors`,
    description: `Manage instructors and class allocation for ${club.name}.`,
  };
}

export default async function ClubAdminInstructorsPage({
  params,
}: ClubAdminInstructorsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const instructors = await getAdminInstructors(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Instructors" clubName={club.name} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminNavLinks>
          <AdminBackLink clubSlug={club.slug} />
        </AdminNavLinks>
        <div className="flex flex-wrap gap-2">
          <Link
            href={clubAdminPath(club.slug, "instructors/classes")}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
          >
            Class Allocations
          </Link>
          <Link
            href={clubAdminPath(club.slug, "instructors/new")}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
          >
            Add Instructor
          </Link>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            INSTRUCTOR STAFF
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Instructors, admins and super admins for this club.
          </p>
        </div>

        <InstructorsList clubSlug={club.slug} instructors={instructors} />
      </section>
    </main>
  );
}
