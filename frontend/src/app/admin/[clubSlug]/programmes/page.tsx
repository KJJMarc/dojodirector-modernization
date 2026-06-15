import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { ProgrammeManagementOverview } from "@/components/admin/programme-management-overview";
import { ProgrammeManagementUnavailableNotice } from "@/components/admin/programme-management-unavailable-notice";
import { AppHeader } from "@/components/layout/app-header";
import { clubProgrammesAdminPath } from "@/lib/admin-programmes.shared";
import {
  getProgrammesSchemaAvailable,
  loadClubProgrammes,
} from "@/lib/admin-programmes.server";
import { requireClubBySlug } from "@/lib/clubs.server";

const CREATE_PROGRAMME_BUTTON_CLASS =
  "inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1.5 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red";

export const dynamic = "force-dynamic";

interface ProgrammeManagementPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ProgrammeManagementPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Programme Management`,
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
              Programmes
            </h2>
            <p className="mt-1 text-xs text-dojo-muted">
              View, edit and activate programmes, configure feature toggles, and
              create new programme areas. Classes are linked to a programme via
              class templates.
            </p>
          </div>
          {programmesSchemaAvailable ? (
            <Link
              href={clubProgrammesAdminPath(club.slug, "new")}
              className={CREATE_PROGRAMME_BUTTON_CLASS}
            >
              Create New Programme
            </Link>
          ) : null}
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
