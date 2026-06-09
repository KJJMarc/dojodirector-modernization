import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { ArchivedLeadsTable } from "@/components/admin/archived-leads-table";
import { AppHeader } from "@/components/layout/app-header";
import { requireClubBySlug } from "@/lib/clubs.server";
import {
  LEADS_NOT_CONFIGURED_MESSAGE,
  loadAdminArchivedLeads,
} from "@/lib/leads.server";
import { clubLeadsAdminPath } from "@/lib/leads.shared";

export const dynamic = "force-dynamic";

const ARCHIVED_LEADS_NOT_CONFIGURED_MESSAGE =
  "Archived leads are not set up yet. Please run the database migration.";

interface ArchivedLeadsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ArchivedLeadsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Archived Leads`,
    description: `Archived trial enquiry leads for ${club.name}.`,
  };
}

export default async function ArchivedLeadsPage({ params }: ArchivedLeadsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const { leadsTableAvailable, archivedLeadsAvailable, leads } =
    await loadAdminArchivedLeads(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Archived Leads" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubLeadsAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Manage Leads
        </Link>
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        Archived leads are hidden from active pipelines. Restore a lead to return it to
        the main list.
      </p>

      {!leadsTableAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {LEADS_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : !archivedLeadsAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {ARCHIVED_LEADS_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <ArchivedLeadsTable clubSlug={club.slug} leads={leads} />
      )}
    </main>
  );
}
