import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { LeadHistoryClient } from "@/components/admin/lead-history-client";
import { LeadHistorySummaryCards } from "@/components/admin/lead-history-summary-cards";
import { AppHeader } from "@/components/layout/app-header";
import { requireClubBySlug } from "@/lib/clubs.server";
import { LEADS_NOT_CONFIGURED_MESSAGE, loadAdminLeadHistory } from "@/lib/leads.server";
import { clubLeadsAdminPath } from "@/lib/leads.shared";

export const dynamic = "force-dynamic";

interface LeadHistoryPageProps {
  params: { clubSlug: string };
  searchParams?: { q?: string };
}

export async function generateMetadata({ params }: LeadHistoryPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Lead History`,
    description: `Month-by-month lead history and reporting for ${club.name}, including joined and archived leads.`,
  };
}

export default async function LeadHistoryPage({
  params,
  searchParams,
}: LeadHistoryPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const { leadsTableAvailable, leads, summary } = await loadAdminLeadHistory(club.id);
  const initialSearchQuery = searchParams?.q?.trim() ?? "";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Lead History" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubLeadsAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Manage Leads
        </Link>
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        Complete lead history for {club.name}, including active, joined, archived, and
        restored leads. The default table shows every lead still in the database.
      </p>

      {!leadsTableAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {LEADS_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <>
          <LeadHistorySummaryCards summary={summary} />
          <LeadHistoryClient
            clubSlug={club.slug}
            leads={leads}
            initialSearchQuery={initialSearchQuery}
          />
        </>
      )}
    </main>
  );
}
