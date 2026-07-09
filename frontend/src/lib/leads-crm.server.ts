import "server-only";

import {
  ensureLeadActivitiesBackfilled,
  loadLeadActivitiesForLead,
  loadLeadActivitiesForLeadIds,
  toLeadBackfillInput,
} from "@/lib/lead-activities.server";
import { loadAcademyLeadWorkflow } from "@/lib/lead-workflow.server";
import {
  buildActiveLeadsDashboardSummary,
  enrichLeadWithCrmFields,
  type ActiveLeadsDashboardSummary,
  type AdminLeadCrmRow,
  type LeadActivity,
} from "@/lib/leads-crm.shared";
import {
  buildAdminLeadsSummary,
  type AdminLeadDetail,
  type AdminLeadsSummary,
} from "@/lib/leads.shared";
import {
  loadAdminLeadDetail,
  loadAdminLeads,
  type AdminLeadsLoadResult,
} from "@/lib/leads.server";

export interface ActiveLeadsCrmLoadResult extends AdminLeadsLoadResult {
  leads: AdminLeadCrmRow[];
  dashboard: ActiveLeadsDashboardSummary;
  crmAvailable: boolean;
}

export interface AdminLeadDetailCrmLoadResult {
  lead: AdminLeadDetail;
  activities: LeadActivity[];
  crmAvailable: boolean;
}

async function enrichLeadsWithCrm(
  academyId: string,
  leads: AdminLeadsLoadResult["leads"],
): Promise<{ leads: AdminLeadCrmRow[]; crmAvailable: boolean }> {
  if (leads.length === 0) {
    return { leads: [], crmAvailable: false };
  }

  const workflow = await loadAcademyLeadWorkflow(academyId);
  await ensureLeadActivitiesBackfilled(
    leads.map((lead) => toLeadBackfillInput(lead, academyId)),
  );
  const activitiesByLeadId = await loadLeadActivitiesForLeadIds(leads.map((lead) => lead.id));
  const crmAvailable = activitiesByLeadId.size > 0 || workflow.stages.length > 0;

  const enriched = leads.map((lead) =>
    enrichLeadWithCrmFields({
      lead,
      activities: activitiesByLeadId.get(lead.id) ?? [],
      workflow,
    }),
  );

  return { leads: enriched, crmAvailable };
}

export async function loadActiveLeadsCrmWorkspace(
  academyId: string,
): Promise<ActiveLeadsCrmLoadResult> {
  const base = await loadAdminLeads(academyId);

  if (!base.leadsTableAvailable) {
    return {
      ...base,
      leads: [],
      dashboard: buildActiveLeadsDashboardSummary([]),
      crmAvailable: false,
    };
  }

  const { leads, crmAvailable } = await enrichLeadsWithCrm(academyId, base.leads);

  return {
    leadsTableAvailable: base.leadsTableAvailable,
    leads,
    summary: buildAdminLeadsSummary(leads),
    dashboard: buildActiveLeadsDashboardSummary(leads),
    crmAvailable,
  };
}

export async function loadAdminLeadDetailCrm(
  academyId: string,
  leadId: string,
): Promise<AdminLeadDetailCrmLoadResult | null> {
  const lead = await loadAdminLeadDetail(academyId, leadId);

  if (!lead) {
    return null;
  }

  await ensureLeadActivitiesBackfilled([
  {
    id: lead.id,
    academyId: lead.academyId,
    submittedAt: lead.submittedAt,
    contactedAt: lead.contactedAt,
    trialBookedAt: lead.trialBookedAt,
    trialAttendedAt: lead.trialAttendedAt,
    joinedAt: lead.joinedAt,
    status: lead.status,
  },
  ]);

  const activities = await loadLeadActivitiesForLead(leadId);

  return {
    lead,
    activities,
    crmAvailable: true,
  };
}
