import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { AddStudentForm } from "@/components/admin/add-student-form";
import { AppHeader } from "@/components/layout/app-header";
import { loadClubProgrammesForAddStudent } from "@/lib/admin-programmes.server";
import { BAHAMAS_JIU_JITSU_CLUB_SLUG, clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ClubAddStudentPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubAddStudentPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Add Student`,
    description: `Register a new student for ${club.name}.`,
  };
}

export default async function ClubAddStudentPage({
  params,
}: ClubAddStudentPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const programmes = await loadClubProgrammesForAddStudent(club.id, {
    clubSlug: club.slug,
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Add Student" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "students")} className={adminNavLinkClassName}>
          ← Back to BJJ Students
        </Link>
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            NEW STUDENT
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Creates a user account and club membership. Choose programme student areas and
            booking access below.
          </p>
        </div>

        {club.slug === BAHAMAS_JIU_JITSU_CLUB_SLUG ? (
          <p
            className="text-xs text-dojo-muted"
            data-testid="bahamas-add-student-programme-debug"
          >
            Loaded programmes:{" "}
            {programmes.map((programme) => programme.programmeType).join(", ") ||
              "(none)"}
          </p>
        ) : null}

        <AddStudentForm clubSlug={club.slug} programmes={programmes} />
      </section>
    </main>
  );
}
