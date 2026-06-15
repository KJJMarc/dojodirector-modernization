import type { Metadata } from "next";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { LeadsAreaCards } from "@/components/admin/leads-area-cards";
import { LeadsSummaryCards } from "@/components/admin/leads-summary-cards";
import { AppHeader } from "@/components/layout/app-header";
import { requireClubBySlug } from "@/lib/clubs.server";
import { LEADS_NOT_CONFIGURED_MESSAGE, loadAdminLeads } from "@/lib/leads.server";

export const dynamic = "force-dynamic";

interface ManageLeadsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({ params }: ManageLeadsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Manage Leads`,
    description: `Trial enquiries and follow-up for ${club.name}.`,
  };
}

export default async function ManageLeadsPage({ params }: ManageLeadsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const { leadsTableAvailable, summary } = await loadAdminLeads(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Manage Leads" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        View and follow up trial enquiry leads for {club.name}. Public enquiry forms are
        managed from Academy Pages.
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
          <LeadsSummaryCards summary={summary} />
          <LeadsAreaCards clubSlug={club.slug} />
        </>
      )}
    </main>
  );
}
