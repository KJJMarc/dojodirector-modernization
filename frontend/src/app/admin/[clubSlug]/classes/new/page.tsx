import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { RecurringClassForm } from "@/components/admin/recurring-class-form";
import { AppHeader } from "@/components/layout/app-header";
import { loadRecurringClassProgrammeOptionsForClub } from "@/lib/admin-recurring-classes.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubNewClassPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubNewClassPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Add recurring class`,
    description: `Create a recurring class template for ${club.name}.`,
  };
}

export default async function ClubNewClassPage({
  params,
}: ClubNewClassPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const programmeOptions = await loadRecurringClassProgrammeOptionsForClub(
    club.id,
    club.slug,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Add Recurring Class" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "classes/edit")} className={adminNavLinkClassName}>
          ← Back to Edit / Update Classes
        </Link>
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            NEW RECURRING CLASS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Creates a class template when needed and generates sessions for the
            next 8 weeks on the public booking page and /attendance.
          </p>
        </div>

        <RecurringClassForm
          clubSlug={club.slug}
          programmeOptions={programmeOptions}
        />
      </section>
    </main>
  );
}
