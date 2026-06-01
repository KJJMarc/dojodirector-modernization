import type { Metadata } from "next";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { ProgrammeManagementOverview } from "@/components/admin/programme-management-overview";
import { ProgrammeManagementUnavailableNotice } from "@/components/admin/programme-management-unavailable-notice";
import { AppHeader } from "@/components/layout/app-header";
import {
  getProgrammesSchemaAvailable,
  loadClubProgrammes,
} from "@/lib/admin-programmes.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ProgrammeManagementPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ProgrammeManagementPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Programme Management`,
    description: `Manage programmes for ${club.name}.`,
  };
}

export default async function ProgrammeManagementPage({
  params,
}: ProgrammeManagementPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const programmesSchemaAvailable = await getProgrammesSchemaAvailable();
  const programmes = programmesSchemaAvailable
    ? await loadClubProgrammes(club.id)
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Programme Management" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Programmes
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Configure programme settings and feature toggles. Classes are linked
            to a programme via class templates.
          </p>
        </div>

        {programmesSchemaAvailable ? (
          <ProgrammeManagementOverview
            clubSlug={club.slug}
            programmes={programmes}
          />
        ) : (
          <ProgrammeManagementUnavailableNotice />
        )}
      </section>
    </main>
  );
}
