import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { LeadDetailCrmView } from "@/components/admin/lead-detail-crm-view";
import { AppHeader } from "@/components/layout/app-header";
import Link from "next/link";
import { clubLeadsAdminPath, clubLeadsListAdminPath } from "@/lib/leads.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { loadAcademyLeadWorkflow } from "@/lib/lead-workflow.server";
import { enrichLeadWithCrmFields } from "@/lib/leads-crm.shared";
import { loadAdminLeadDetailCrm } from "@/lib/leads-crm.server";
import { LEADS_NOT_CONFIGURED_MESSAGE, getLeadsTableAvailable } from "@/lib/leads.server";
import { computeLeadFollowUpStatus } from "@/lib/leads.shared";

export const dynamic = "force-dynamic";

interface LeadDetailPageProps {
  params: { clubSlug: string; leadId: string };
}

export async function generateMetadata({ params }: LeadDetailPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);
  const detail = await loadAdminLeadDetailCrm(club.id, params.leadId);
  const lead = detail?.lead;

  return {
    title: lead
      ? `Dojo Director | ${club.name} Lead — ${lead.fullName}`
      : `Dojo Director | ${club.name} Lead`,
    description: `Lead details for ${club.name}.`,
  };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const leadsTableAvailable = await getLeadsTableAvailable();

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

  const detail = await loadAdminLeadDetailCrm(club.id, params.leadId);

  if (!detail) {
    notFound();
  }

  const workflow = await loadAcademyLeadWorkflow(club.id);
  const linkedSessions = detail.lead.linkedTrialSessionStartsAt
    ? detail.lead.linkedTrialSessionStartsAt
    : null;
  const crmLead = enrichLeadWithCrmFields({
    lead: {
      id: detail.lead.id,
      fullName: detail.lead.fullName,
      email: detail.lead.email,
      phone: detail.lead.phone,
      programmeInterest: detail.lead.programmeInterest,
      experienceLevel: detail.lead.experienceLevel,
      leadSource: detail.lead.leadSource,
      status: detail.lead.status,
      statusLabel: detail.lead.statusLabel,
      trialAttendancePending: detail.lead.trialAttendancePending,
      createdAt: detail.lead.createdAt,
      submittedAt: detail.lead.submittedAt,
      contactedAt: detail.lead.contactedAt,
      trialBookedAt: detail.lead.trialBookedAt,
      trialAttendedAt: detail.lead.trialAttendedAt,
      joinedAt: detail.lead.joinedAt,
      lastActivityAt: detail.lead.lastActivityAt,
      updatedAt: detail.lead.updatedAt,
      linkedTrialSessionStartsAt: linkedSessions,
      followUpStatus: computeLeadFollowUpStatus({
        status: detail.lead.status,
        submittedAt: detail.lead.submittedAt,
        contactedAt: detail.lead.contactedAt,
        trialAttendedAt: detail.lead.trialAttendedAt,
        linkedTrialSessionStartsAt: detail.lead.linkedTrialSessionStartsAt,
      }),
      leadSourceLabel: detail.lead.leadSourceLabel,
    },
    activities: detail.activities,
    workflow,
  });

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

      <LeadDetailCrmView
        clubSlug={club.slug}
        lead={detail.lead}
        activities={detail.activities}
        health={crmLead.leadHealth}
        healthLabel={crmLead.healthLabel}
        bannerLabel={crmLead.bannerLabel}
      />
    </main>
  );
}
