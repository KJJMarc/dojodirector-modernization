import "server-only";

import {
  isManualLeadActivityType,
  LEAD_CRM_NOT_CONFIGURED_MESSAGE,
  parseLeadActivityFollowUpAt,
  resolveActivityDirectionForManualType,
  type LeadActivity,
  type LeadActivityType,
  type ManualLeadActivityType,
} from "@/lib/leads-crm.shared";
import type { AdminLeadListRow } from "@/lib/leads.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

interface LeadActivityRow {
  id: string;
  lead_id: string;
  activity_type: string;
  direction: string;
  body: string | null;
  staff_user_id: string | null;
  staff_display_name: string | null;
  follow_up_at: string | null;
  created_at: string;
}

let leadActivitiesTableAvailable: boolean | null = null;

function isMissingLeadActivitiesTableError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    message.includes("lead_activities") ||
    message.includes("does not exist")
  );
}

export async function checkLeadActivitiesTableAvailable() {
  if (leadActivitiesTableAvailable === true) {
    return true;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("lead_activities").select("id").limit(0);

  if (error && isMissingLeadActivitiesTableError(error)) {
    leadActivitiesTableAvailable = false;
    return false;
  }

  if (error) {
    return false;
  }

  leadActivitiesTableAvailable = true;
  return true;
}

function mapLeadActivityRow(row: LeadActivityRow): LeadActivity {
  return {
    id: row.id,
    leadId: row.lead_id,
    activityType: row.activity_type as LeadActivityType,
    direction: row.direction as LeadActivity["direction"],
    body: row.body,
    staffUserId: row.staff_user_id,
    staffDisplayName: row.staff_display_name,
    followUpAt: row.follow_up_at,
    createdAt: row.created_at,
  };
}

export async function loadLeadActivitiesForLeadIds(
  leadIds: string[],
): Promise<Map<string, LeadActivity[]>> {
  const result = new Map<string, LeadActivity[]>();

  if (leadIds.length === 0) {
    return result;
  }

  const tableAvailable = await checkLeadActivitiesTableAvailable();

  if (!tableAvailable) {
    return result;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("lead_activities")
    .select(
      "id, lead_id, activity_type, direction, body, staff_user_id, staff_display_name, follow_up_at, created_at",
    )
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingLeadActivitiesTableError(error)) {
      leadActivitiesTableAvailable = false;
      return result;
    }

    console.warn("[Lead CRM] Failed to load lead activities:", error.message);
    return result;
  }

  for (const row of data ?? []) {
    const activity = mapLeadActivityRow(row as LeadActivityRow);
    const existing = result.get(activity.leadId) ?? [];
    existing.push(activity);
    result.set(activity.leadId, existing);
  }

  return result;
}

export async function loadLeadActivitiesForLead(leadId: string): Promise<LeadActivity[]> {
  const activitiesByLeadId = await loadLeadActivitiesForLeadIds([leadId]);
  return activitiesByLeadId.get(leadId) ?? [];
}

interface LeadBackfillInput {
  id: string;
  academyId: string;
  submittedAt: string;
  contactedAt: string | null;
  trialBookedAt: string | null;
  trialAttendedAt: string | null;
  joinedAt: string | null;
  status: string;
}

function buildBackfillActivityRows(lead: LeadBackfillInput) {
  const rows: {
    academy_id: string;
    lead_id: string;
    activity_type: LeadActivityType;
    direction: "system";
    body: string | null;
    metadata: { source_key: string };
    created_at: string;
  }[] = [];

  if (lead.submittedAt) {
    rows.push({
      academy_id: lead.academyId,
      lead_id: lead.id,
      activity_type: "enquiry_received",
      direction: "system",
      body: null,
      metadata: { source_key: "submitted_at" },
      created_at: lead.submittedAt,
    });
    rows.push({
      academy_id: lead.academyId,
      lead_id: lead.id,
      activity_type: "welcome_email",
      direction: "system",
      body: null,
      metadata: { source_key: "welcome_email" },
      created_at: lead.submittedAt,
    });
  }

  if (lead.trialBookedAt) {
    rows.push({
      academy_id: lead.academyId,
      lead_id: lead.id,
      activity_type: "trial_booked",
      direction: "system",
      body: null,
      metadata: { source_key: "trial_booked_at" },
      created_at: lead.trialBookedAt,
    });
  }

  if (lead.trialAttendedAt) {
    rows.push({
      academy_id: lead.academyId,
      lead_id: lead.id,
      activity_type: "trial_attended",
      direction: "system",
      body: null,
      metadata: { source_key: "trial_attended_at" },
      created_at: lead.trialAttendedAt,
    });
  }

  if (lead.joinedAt) {
    rows.push({
      academy_id: lead.academyId,
      lead_id: lead.id,
      activity_type: "joined",
      direction: "system",
      body: null,
      metadata: { source_key: "joined_at" },
      created_at: lead.joinedAt,
    });
  }

  if (lead.status === "trial_missed" && lead.trialBookedAt) {
    rows.push({
      academy_id: lead.academyId,
      lead_id: lead.id,
      activity_type: "trial_missed",
      direction: "system",
      body: null,
      metadata: { source_key: "trial_missed_status" },
      created_at: lead.trialAttendedAt ?? lead.trialBookedAt,
    });
  }

  return rows;
}

export async function ensureLeadActivitiesBackfilled(leads: LeadBackfillInput[]) {
  const tableAvailable = await checkLeadActivitiesTableAvailable();

  if (!tableAvailable || leads.length === 0) {
    return;
  }

  const leadIds = leads.map((lead) => lead.id);
  const existingByLeadId = await loadLeadActivitiesForLeadIds(leadIds);
  const supabase = getSupabaseAdminClient();

  for (const lead of leads) {
    if ((existingByLeadId.get(lead.id) ?? []).length > 0) {
      continue;
    }

    const rows = buildBackfillActivityRows(lead);

    if (rows.length === 0) {
      continue;
    }

    const { error } = await supabase.from("lead_activities").insert(rows);

    if (error && error.code !== "23505" && !isMissingLeadActivitiesTableError(error)) {
      console.warn("[Lead CRM] Failed to backfill activities for lead", lead.id, error.message);
    }
  }
}

export async function logLeadActivity(input: {
  academyId: string;
  leadId: string;
  activityType: ManualLeadActivityType;
  body?: string | null;
  staffUserId?: string | null;
  staffDisplayName?: string | null;
  followUpAt?: string | null;
}) {
  if (!isManualLeadActivityType(input.activityType)) {
    throw new Error("Unsupported manual activity type.");
  }

  const tableAvailable = await checkLeadActivitiesTableAvailable();

  if (!tableAvailable) {
    throw new Error(LEAD_CRM_NOT_CONFIGURED_MESSAGE);
  }

  const followUpAt = parseLeadActivityFollowUpAt(input.followUpAt);

  if (input.followUpAt?.trim() && !followUpAt) {
    throw new Error("Follow-up date must be a valid date.");
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const direction = resolveActivityDirectionForManualType(input.activityType);
  const { data, error } = await supabase
    .from("lead_activities")
    .insert({
      academy_id: input.academyId,
      lead_id: input.leadId,
      activity_type: input.activityType,
      direction,
      body: input.body?.trim() || null,
      staff_user_id: input.staffUserId ?? null,
      staff_display_name: input.staffDisplayName ?? null,
      follow_up_at: followUpAt,
      created_at: now,
    })
    .select(
      "id, lead_id, activity_type, direction, body, staff_user_id, staff_display_name, follow_up_at, created_at",
    )
    .single();

  if (error) {
    throw new Error(`Failed to log lead activity: ${error.message}`);
  }

  const isOutbound = direction === "outbound";
  const leadUpdate: Record<string, string> = {
    last_activity_at: now,
    updated_at: now,
  };

  if (isOutbound) {
    const { data: existingLead, error: existingError } = await supabase
      .from("leads")
      .select("contacted_at")
      .eq("academy_id", input.academyId)
      .eq("id", input.leadId)
      .maybeSingle();

    if (!existingError && existingLead && !existingLead.contacted_at) {
      leadUpdate.contacted_at = now;
    }
  }

  if (followUpAt) {
    // Reserved for a future cached next_follow_up_at column.
  }

  const { error: leadUpdateError } = await supabase
    .from("leads")
    .update(leadUpdate)
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId);

  if (leadUpdateError) {
    console.warn("[Lead CRM] Activity saved but lead update failed:", leadUpdateError.message);
  }

  return mapLeadActivityRow(data as LeadActivityRow);
}

export function toLeadBackfillInput(lead: AdminLeadListRow & { academyId?: string }, academyId: string): LeadBackfillInput {
  return {
    id: lead.id,
    academyId,
    submittedAt: lead.submittedAt,
    contactedAt: lead.contactedAt,
    trialBookedAt: lead.trialBookedAt,
    trialAttendedAt: lead.trialAttendedAt,
    joinedAt: lead.joinedAt,
    status: lead.status,
  };
}
