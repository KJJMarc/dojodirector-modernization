import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { LeadDetailView } from "@/components/admin/lead-detail-view";
import { AppHeader } from "@/components/layout/app-header";
import Link from "next/link";
import { clubLeadsAdminPath, clubLeadsListAdminPath } from "@/lib/leads.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { LEADS_NOT_CONFIGURED_MESSAGE, loadAdminLeadDetail, loadAdminLeads } from "@/lib/leads.server";

export const dynamic = "force-dynamic";

interface LeadDetailPageProps {
  params: { clubSlug: string; leadId: string };
}

export async function generateMetadata({ params }: LeadDetailPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);
  const lead = await loadAdminLeadDetail(club.id, params.leadId);

  return {
    title: lead
      ? `DojoDirector | ${club.name} Lead — ${lead.fullName}`
      : `DojoDirector | ${club.name} Lead`,
    description: `Lead details for ${club.name}.`,
  };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const { leadsTableAvailable } = await loadAdminLeads(club.id);

  if (!leadsTableAvailable) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
        <AppHeader pageTitle="Lead" clubName={club.name} />
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {LEADS_NOT_CONFIGURED_MESSAGE}
        </section>
      </main>
    );
  }

  const lead = await loadAdminLeadDetail(club.id, params.leadId);

  if (!lead) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Lead Details" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubLeadsListAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Leads
        </Link>
        <Link href={clubLeadsAdminPath(club.slug)} className={adminNavLinkClassName}>
          Manage Leads
        </Link>
      </AdminNavLinks>

      <LeadDetailView clubSlug={club.slug} lead={lead} />
    </main>
  );
}
