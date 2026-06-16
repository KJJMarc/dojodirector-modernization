import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { AddLeadForm } from "@/components/admin/add-lead-form";
import { AppHeader } from "@/components/layout/app-header";
import { requireClubBySlug } from "@/lib/clubs.server";
import { LEADS_NOT_CONFIGURED_MESSAGE, getLeadsTableAvailable } from "@/lib/leads.server";
import { clubLeadsAdminPath } from "@/lib/leads.shared";

export const dynamic = "force-dynamic";

interface AddLeadPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({ params }: AddLeadPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Add Lead`,
    description: `Manually add a trial enquiry lead for ${club.name}.`,
  };
}

export default async function AddLeadPage({ params }: AddLeadPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const leadsTableAvailable = await getLeadsTableAvailable();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Add Lead" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubLeadsAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Manage Leads
        </Link>
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        Record a manual enquiry for {club.name}. No notification emails are sent for
        admin-created leads.
      </p>

      {!leadsTableAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {LEADS_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <AddLeadForm clubSlug={club.slug} />
      )}
    </main>
  );
}
