import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { LeadsSummaryCards } from "@/components/admin/leads-summary-cards";
import { LeadsTable } from "@/components/admin/leads-table";
import { AppHeader } from "@/components/layout/app-header";
import { requireClubBySlug } from "@/lib/clubs.server";
import { LEADS_NOT_CONFIGURED_MESSAGE, loadAdminLeads } from "@/lib/leads.server";
import { clubLeadNewAdminPath, clubLeadsAdminPath } from "@/lib/leads.shared";

export const dynamic = "force-dynamic";

interface LeadsListPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({ params }: LeadsListPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Leads`,
    description: `Trial enquiry leads for ${club.name}.`,
  };
}

export default async function LeadsListPage({ params }: LeadsListPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const { leadsTableAvailable, leads, summary } = await loadAdminLeads(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Leads" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubLeadsAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Manage Leads
        </Link>
      </AdminNavLinks>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-dojo-muted">
          Newest leads first. Click a name to view and edit details.
        </p>
        <Link
          href={clubLeadNewAdminPath(club.slug)}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20"
        >
          Add lead
        </Link>
      </div>

      {!leadsTableAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {LEADS_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <>
          <LeadsSummaryCards summary={summary} />
          <LeadsTable clubSlug={club.slug} leads={leads} />
        </>
      )}
    </main>
  );
}
