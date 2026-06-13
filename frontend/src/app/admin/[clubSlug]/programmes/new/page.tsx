import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { CreateProgrammeForm } from "@/components/admin/create-programme-form";
import { ProgrammeManagementUnavailableNotice } from "@/components/admin/programme-management-unavailable-notice";
import { AppHeader } from "@/components/layout/app-header";
import { clubProgrammesAdminPath } from "@/lib/admin-programmes.shared";
import {
  getProgrammesSchemaAvailable,
  loadClubProgrammeSlugs,
} from "@/lib/admin-programmes.server";
import { requireClubBySlug } from "@/lib/clubs.server";

import { createProgrammeAction } from "./actions";

export const dynamic = "force-dynamic";

interface CreateProgrammePageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: CreateProgrammePageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Create Programme`,
    description: `Create a programme for ${club.name}.`,
  };
}

export default async function CreateProgrammePage({
  params,
}: CreateProgrammePageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const programmesSchemaAvailable = await getProgrammesSchemaAvailable();
  const existingProgrammeSlugs = programmesSchemaAvailable
    ? await loadClubProgrammeSlugs(club.id)
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Create Programme" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link
          href={clubProgrammesAdminPath(club.slug)}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to Programme Management
        </Link>
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        {programmesSchemaAvailable ? (
          <CreateProgrammeForm
            clubSlug={club.slug}
            existingProgrammeSlugs={existingProgrammeSlugs}
            action={createProgrammeAction}
          />
        ) : (
          <ProgrammeManagementUnavailableNotice />
        )}
      </section>
    </main>
  );
}
