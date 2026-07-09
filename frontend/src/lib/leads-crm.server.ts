import "server-only";

import {
  ensureLeadActivitiesBackfilled,
  getLeadActivitiesTableStatus,
  loadLeadActivitiesForLead,
  loadLeadActivitiesForLeadIds,
  toLeadBackfillInput,
} from "@/lib/lead-activities.server";
import {
  getAcademyLeadWorkflowsTableStatus,
  loadAcademyLeadWorkflow,
} from "@/lib/lead-workflow.server";
import {
  buildActiveLeadsDashboardSummary,
  enrichLeadWithCrmFields,
  LEAD_CRM_GRANTS_REQUIRED_MESSAGE,
  LEAD_CRM_NOT_CONFIGURED_MESSAGE,
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
  crmSetupMessage: string | null;
}

function resolveLeadCrmSetupMessage(
  activitiesStatus: Awaited<ReturnType<typeof getLeadActivitiesTableStatus>>,
  workflowsStatus: Awaited<ReturnType<typeof getAcademyLeadWorkflowsTableStatus>>,
): string | null {
  if (activitiesStatus === "missing" || workflowsStatus === "missing") {
    return LEAD_CRM_NOT_CONFIGURED_MESSAGE;
  }

  if (activitiesStatus === "permission_denied" || workflowsStatus === "permission_denied") {
    return LEAD_CRM_GRANTS_REQUIRED_MESSAGE;
  }

  if (activitiesStatus !== "available" || workflowsStatus !== "available") {
    return "Lead activity tracking is temporarily unavailable. Please try again shortly.";
  }

  return null;
}

async function enrichLeadsWithCrm(
  academyId: string,
  leads: AdminLeadsLoadResult["leads"],
): Promise<{ leads: AdminLeadCrmRow[]; crmAvailable: boolean }> {
  if (leads.length === 0) {
    return { leads: [], crmAvailable: false };
  }

  const [activitiesStatus, workflowsStatus] = await Promise.all([
    getLeadActivitiesTableStatus(),
    getAcademyLeadWorkflowsTableStatus(),
  ]);
  const crmTablesAvailable =
    activitiesStatus === "available" && workflowsStatus === "available";
  const workflow = await loadAcademyLeadWorkflow(academyId);

  if (crmTablesAvailable) {
    await ensureLeadActivitiesBackfilled(
      leads.map((lead) => toLeadBackfillInput(lead, academyId)),
    );
  }

  const activitiesByLeadId = crmTablesAvailable
    ? await loadLeadActivitiesForLeadIds(leads.map((lead) => lead.id))
    : new Map<string, LeadActivity[]>();

  const enriched = leads.map((lead) =>
    enrichLeadWithCrmFields({
      lead,
      activities: activitiesByLeadId.get(lead.id) ?? [],
      workflow,
    }),
  );

  return { leads: enriched, crmAvailable: crmTablesAvailable };
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

  const [activitiesStatus, workflowsStatus] = await Promise.all([
    getLeadActivitiesTableStatus(),
    getAcademyLeadWorkflowsTableStatus(),
  ]);
  const crmTablesAvailable =
    activitiesStatus === "available" && workflowsStatus === "available";
  const crmSetupMessage = resolveLeadCrmSetupMessage(activitiesStatus, workflowsStatus);

  if (!crmTablesAvailable) {
    return {
      lead,
      activities: [],
      crmAvailable: false,
      crmSetupMessage,
    };
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
    crmSetupMessage: null,
  };
}
