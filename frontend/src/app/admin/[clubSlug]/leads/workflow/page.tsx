import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { LeadWorkflowSettingsClient } from "@/components/admin/lead-workflow-settings-client";
import { AppHeader } from "@/components/layout/app-header";
import { requireClubBySlug } from "@/lib/clubs.server";
import {
  loadAcademyLeadWorkflow,
  toAcademyLeadWorkflowInput,
} from "@/lib/lead-workflow.server";
import { clubLeadsAdminPath } from "@/lib/leads.shared";

export const dynamic = "force-dynamic";

interface LeadWorkflowSettingsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: LeadWorkflowSettingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Lead Workflow Settings`,
    description: `Configure follow-up workflow for ${club.name}.`,
  };
}

export default async function LeadWorkflowSettingsPage({
  params,
}: LeadWorkflowSettingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const workflow = await loadAcademyLeadWorkflow(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Lead Workflow Settings" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubLeadsAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Manage Leads
        </Link>
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        Configure follow-up stages, timings and recommendations for this academy. Changes apply
        immediately to Active Leads health, banners, and follow-up dates.
      </p>

      <LeadWorkflowSettingsClient
        clubSlug={club.slug}
        initialWorkflow={toAcademyLeadWorkflowInput(workflow)}
      />
    </main>
  );
}
