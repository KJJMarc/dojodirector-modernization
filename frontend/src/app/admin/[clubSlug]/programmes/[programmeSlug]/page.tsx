import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { ProgrammeManagementUnavailableNotice } from "@/components/admin/programme-management-unavailable-notice";
import { ProgrammeSettingsForm } from "@/components/admin/programme-settings-form";
import { AppHeader } from "@/components/layout/app-header";
import {
  clubProgrammesAdminPath,
  formatProgrammeStudentsLabel,
  programmeStudentsAdminPath,
} from "@/lib/admin-programmes.shared";
import {
  getProgrammesSchemaAvailable,
  requireClubProgrammeBySlug,
} from "@/lib/admin-programmes.server";
import { requireClubBySlug } from "@/lib/clubs.server";

import { updateProgrammeSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

interface ProgrammeSettingsPageProps {
  params: { clubSlug: string; programmeSlug: string };
}

export async function generateMetadata({
  params,
}: ProgrammeSettingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  if (!(await getProgrammesSchemaAvailable())) {
    return {
      title: `DojoDirector | ${club.name} Programme Settings`,
      description: `Configure programmes for ${club.name}.`,
    };
  }

  const programme = await requireClubProgrammeBySlug(club.id, params.programmeSlug);

  return {
    title: `DojoDirector | ${club.name} ${programme.name} Settings`,
    description: `Configure ${programme.name} for ${club.name}.`,
  };
}

export default async function ProgrammeSettingsPage({
  params,
}: ProgrammeSettingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const programmesSchemaAvailable = await getProgrammesSchemaAvailable();

  if (!programmesSchemaAvailable) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Programme Settings" clubName={club.name} />

        <AdminNavLinks>
          <AdminBackLink clubSlug={club.slug} />
          <Link
            href={clubProgrammesAdminPath(club.slug)}
            className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
          >
            ← Programme Management
          </Link>
        </AdminNavLinks>

        <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <ProgrammeManagementUnavailableNotice />
        </section>
      </main>
    );
  }

  const programme = await requireClubProgrammeBySlug(club.id, params.programmeSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle={`${programme.name} Settings`} clubName={club.name} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminNavLinks>
          <AdminBackLink clubSlug={club.slug} />
          <Link
            href={clubProgrammesAdminPath(club.slug)}
            className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
          >
            ← Programme Management
          </Link>
        </AdminNavLinks>
        <Link
          href={programmeStudentsAdminPath(club.slug, programme.slug)}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
        >
          {formatProgrammeStudentsLabel(programme)}
        </Link>
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <ProgrammeSettingsForm
          clubSlug={club.slug}
          programme={programme}
          action={updateProgrammeSettingsAction}
        />
      </section>
    </main>
  );
}
