import "server-only";

import { sendLeadEmailsAfterSubmission } from "@/lib/leads-email.server";
import type { LeadAttribution } from "@/lib/lead-attribution.shared";
import {
  formatAnalyticsLeadSourceLabel,
  normalizeLeadSourceForAnalytics,
} from "@/lib/lead-source-analytics.shared";
import {
  LEADS_NOT_CONFIGURED_MESSAGE,
  buildAdminLeadsSummary,
  computeLeadFollowUpStatus,
  parseLeadStatus,
  normalizeLeadStatus,
  parseLeadSubmission,
  type AdminArchivedLeadListRow,
  type AdminLeadDetail,
  type AdminLeadListRow,
  type AdminLeadsSummary,
  type LeadSubmission,
  type LeadSubmissionResult,
  type LeadStatus,
  type TrialAudience,
} from "@/lib/leads.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

let leadsTableAvailable: boolean | null = null;
let leadTrackingColumnsAvailable: boolean | null = null;
let leadArchivedColumnAvailable: boolean | null = null;
let leadAttributionColumnsAvailable: boolean | null = null;

export { LEADS_NOT_CONFIGURED_MESSAGE };

function isMissingLeadsTableError(error: SupabaseErrorLike) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes('relation "leads" does not exist') ||
    message.includes("could not find the table") ||
    message.includes('relation "public.leads" does not exist') ||
    message.includes("column leads.academy_id does not exist") ||
    message.includes("column leads.submitted_at does not exist")
  );
}

function isMissingLeadTrackingColumnsError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    (error.code === "42703" &&
      (message.includes("submitted_at") || message.includes("last_activity_at"))) ||
    (error.code === "PGRST204" &&
      (message.includes("submitted_at") || message.includes("last_activity_at")))
  );
}

function isMissingLeadArchivedColumnError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    (error.code === "42703" && message.includes("archived_at")) ||
    (error.code === "PGRST204" && message.includes("archived_at"))
  );
}

async function checkLeadsTableAvailable() {
  if (leadsTableAvailable !== null) {
    return leadsTableAvailable;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("leads").select("id, academy_id").limit(0);

  if (isMissingLeadsTableError(error ?? {})) {
    leadsTableAvailable = false;
    return false;
  }

  leadsTableAvailable = !error;
  return leadsTableAvailable;
}

async function checkLeadTrackingColumnsAvailable() {
  if (leadTrackingColumnsAvailable !== null) {
    return leadTrackingColumnsAvailable;
  }

  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    leadTrackingColumnsAvailable = false;
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("leads")
    .select("id, submitted_at, last_activity_at")
    .limit(0);

  if (error && isMissingLeadTrackingColumnsError(error)) {
    leadTrackingColumnsAvailable = false;
    return false;
  }

  leadTrackingColumnsAvailable = !error;
  return leadTrackingColumnsAvailable;
}

function isMissingLeadAttributionColumnsError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    (error.code === "42703" &&
      (message.includes("gclid") ||
        message.includes("fbclid") ||
        message.includes("utm_source") ||
        message.includes("referrer_url"))) ||
    (error.code === "PGRST204" &&
      (message.includes("gclid") ||
        message.includes("fbclid") ||
        message.includes("utm_source") ||
        message.includes("referrer_url")))
  );
}

async function checkLeadAttributionColumnsAvailable() {
  if (leadAttributionColumnsAvailable !== null) {
    return leadAttributionColumnsAvailable;
  }

  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    leadAttributionColumnsAvailable = false;
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("leads").select("id, gclid, referrer_url").limit(0);

  if (error && isMissingLeadAttributionColumnsError(error)) {
    leadAttributionColumnsAvailable = false;
    return false;
  }

  leadAttributionColumnsAvailable = !error;
  return leadAttributionColumnsAvailable;
}

function formatStoredLeadSourceLabel(leadSource: string) {
  const analyticsSource = normalizeLeadSourceForAnalytics(leadSource);

  if (analyticsSource) {
    return formatAnalyticsLeadSourceLabel(analyticsSource);
  }

  return leadSource;
}

function mapLeadAttributionFromRow(row: LeadRecordRow): LeadAttribution {
  return {
    gclid: row.gclid ?? null,
    fbclid: row.fbclid ?? null,
    utm_source: row.utm_source ?? null,
    utm_medium: row.utm_medium ?? null,
    utm_campaign: row.utm_campaign ?? null,
    utm_content: row.utm_content ?? null,
    utm_term: row.utm_term ?? null,
    referrer_url: row.referrer_url ?? null,
  };
}

function appendAttributionToInsertRow(
  row: LeadInsertRow,
  attribution: LeadAttribution | undefined,
): LeadInsertRow {
  if (!attribution) {
    return row;
  }

  return {
    ...row,
    gclid: attribution.gclid,
    fbclid: attribution.fbclid,
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
    referrer_url: attribution.referrer_url,
  };
}

function stripAttributionFromInsertRow(row: LeadInsertRow): LeadInsertRow {
  const {
    gclid: _gclid,
    fbclid: _fbclid,
    utm_source: _utmSource,
    utm_medium: _utmMedium,
    utm_campaign: _utmCampaign,
    utm_content: _utmContent,
    utm_term: _utmTerm,
    referrer_url: _referrerUrl,
    ...baseRow
  } = row;

  return baseRow;
}

const LEAD_ATTRIBUTION_SELECT =
  "gclid, fbclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer_url";

async function checkLeadArchivedColumnAvailable() {
  if (leadArchivedColumnAvailable !== null) {
    return leadArchivedColumnAvailable;
  }

  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    leadArchivedColumnAvailable = false;
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("leads").select("id, archived_at").limit(0);

  if (error && isMissingLeadArchivedColumnError(error)) {
    leadArchivedColumnAvailable = false;
    return false;
  }

  leadArchivedColumnAvailable = !error;
  return leadArchivedColumnAvailable;
}

interface LeadInsertRow {
  academy_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  programme_interest: string;
  experience_level: string;
  lead_source: string;
  notes: string | null;
  status: string;
  submitted_at?: string;
  last_activity_at?: string;
  updated_at?: string;
  contacted_at?: string;
  trial_booked_at?: string;
  trial_attended_at?: string;
  joined_at?: string;
  gclid?: string | null;
  fbclid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer_url?: string | null;
}

function buildLeadInsertRow(
  input: Omit<LeadInsertRow, "submitted_at" | "last_activity_at" | "updated_at"> & {
    status: string;
  },
  now: string,
  trackingAvailable: boolean,
  statusTimestamps: Record<string, string> = {},
): LeadInsertRow {
  const row: LeadInsertRow = {
    academy_id: input.academy_id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone,
    programme_interest: input.programme_interest,
    experience_level: input.experience_level,
    lead_source: input.lead_source,
    notes: input.notes,
    status: input.status,
    ...statusTimestamps,
  };

  if (trackingAvailable) {
    row.submitted_at = now;
    row.last_activity_at = now;
    row.updated_at = now;
  }

  return row;
}

async function insertLeadRow(row: LeadInsertRow) {
  const supabase = getSupabaseAdminClient();
  let trackingAvailable = await checkLeadTrackingColumnsAvailable();
  let attributionAvailable = await checkLeadAttributionColumnsAvailable();
  let payload = row;

  if (!trackingAvailable) {
    const { submitted_at: _submittedAt, last_activity_at: _lastActivityAt, updated_at: _updatedAt, ...baseRow } =
      row;
    payload = baseRow;
  }

  if (!attributionAvailable) {
    payload = stripAttributionFromInsertRow(payload);
  }

  const attemptInsert = async (insertRow: LeadInsertRow) =>
    supabase.from("leads").insert(insertRow).select("id, created_at").single();

  let { data, error } = await attemptInsert(payload);

  if (error && isMissingLeadTrackingColumnsError(error)) {
    leadTrackingColumnsAvailable = false;
    const {
      submitted_at: _submittedAt,
      last_activity_at: _lastActivityAt,
      updated_at: _updatedAt,
      contacted_at: _contactedAt,
      trial_booked_at: _trialBookedAt,
      trial_attended_at: _trialAttendedAt,
      joined_at: _joinedAt,
      ...baseRow
    } = payload;
    payload = baseRow;
    ({ data, error } = await attemptInsert(payload));
  }

  if (error && isMissingLeadAttributionColumnsError(error)) {
    leadAttributionColumnsAvailable = false;
    ({ data, error } = await attemptInsert(stripAttributionFromInsertRow(payload)));
  }

  return { data, error };
}

interface LeadRecordRow {
  id: string;
  academy_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  programme_interest: string;
  experience_level: string;
  lead_source: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  contacted_at?: string | null;
  trial_booked_at?: string | null;
  trial_attended_at?: string | null;
  joined_at?: string | null;
  last_activity_at?: string | null;
  archived_at?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer_url?: string | null;
}

function mapArchivedLeadListRow(row: LeadRecordRow): AdminArchivedLeadListRow {
  const archivedAt = row.archived_at?.trim();

  if (!archivedAt) {
    throw new Error("Archived lead is missing archived_at.");
  }

  return {
    id: row.id,
    fullName: row.full_name,
    status: normalizeLeadStatus(row.status),
    programmeInterest:
      row.programme_interest as AdminArchivedLeadListRow["programmeInterest"],
    archivedAt,
  };
}

function resolveSubmittedAt(row: LeadRecordRow) {
  return row.submitted_at ?? row.created_at;
}

function resolveLastActivityAt(row: LeadRecordRow) {
  return row.last_activity_at ?? row.updated_at ?? row.created_at;
}

function mapLeadListRow(
  row: LeadRecordRow,
  linkedTrialSessionStartsAt: string | null,
): AdminLeadListRow {
  const submittedAt = resolveSubmittedAt(row);
  const trialAttendedAt = row.trial_attended_at ?? null;

  const status = normalizeLeadStatus(row.status);

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    programmeInterest: row.programme_interest as AdminLeadListRow["programmeInterest"],
    experienceLevel: row.experience_level as AdminLeadListRow["experienceLevel"],
    leadSource: row.lead_source as AdminLeadListRow["leadSource"],
    leadSourceLabel: formatStoredLeadSourceLabel(row.lead_source),
    status,
    createdAt: row.created_at,
    submittedAt,
    contactedAt: row.contacted_at ?? null,
    trialBookedAt: row.trial_booked_at ?? null,
    trialAttendedAt,
    joinedAt: row.joined_at ?? null,
    lastActivityAt: resolveLastActivityAt(row),
    linkedTrialSessionStartsAt,
    followUpStatus: computeLeadFollowUpStatus({
      status,
      submittedAt,
      contactedAt: row.contacted_at ?? null,
      trialAttendedAt,
      linkedTrialSessionStartsAt,
    }),
  };
}

function mapLeadDetail(row: LeadRecordRow): AdminLeadDetail {
  return {
    id: row.id,
    academyId: row.academy_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    programmeInterest: row.programme_interest as AdminLeadDetail["programmeInterest"],
    experienceLevel: row.experience_level as AdminLeadDetail["experienceLevel"],
    leadSource: row.lead_source as AdminLeadDetail["leadSource"],
    leadSourceLabel: formatStoredLeadSourceLabel(row.lead_source),
    notes: row.notes,
    status: normalizeLeadStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: resolveSubmittedAt(row),
    contactedAt: row.contacted_at ?? null,
    trialBookedAt: row.trial_booked_at ?? null,
    trialAttendedAt: row.trial_attended_at ?? null,
    joinedAt: row.joined_at ?? null,
    lastActivityAt: resolveLastActivityAt(row),
    attribution: mapLeadAttributionFromRow(row),
  };
}

function buildStatusTimestampUpdates(
  status: LeadStatus,
  existing: LeadRecordRow,
  now: string,
  trackingAvailable: boolean,
): Record<string, string> {
  const updates: Record<string, string> = {
    updated_at: now,
  };

  if (!trackingAvailable) {
    return updates;
  }

  updates.last_activity_at = now;

  if (status === "trial_booked" && !existing.trial_booked_at) {
    updates.trial_booked_at = now;
  }

  if (status === "trial_attended" && !existing.trial_attended_at) {
    updates.trial_attended_at = now;
  }

  if (status === "joined" && !existing.joined_at) {
    updates.joined_at = now;
  }

  return updates;
}

async function loadLinkedTrialSessionStartsAtByLeadId(
  leadIds: string[],
): Promise<Map<string, string>> {
  if (leadIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guest_bookings")
    .select("lead_id, session_id, class_sessions(starts_at)")
    .in("lead_id", leadIds)
    .eq("booking_status", "booked")
    .order("created_at", { ascending: false });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";

    if (
      error.code === "42P01" ||
      error.code === "42703" ||
      message.includes("guest_bookings.lead_id") ||
      message.includes('relation "guest_bookings" does not exist')
    ) {
      return new Map();
    }

    throw new Error(`Failed to load linked trial sessions: ${error.message}`);
  }

  const result = new Map<string, string>();

  for (const row of data ?? []) {
    const leadId = (row as { lead_id: string | null }).lead_id;

    if (!leadId || result.has(leadId)) {
      continue;
    }

    const sessionRelation = (row as { class_sessions?: unknown }).class_sessions;
    const session = Array.isArray(sessionRelation) ? sessionRelation[0] : sessionRelation;
    const startsAt = (session as { starts_at?: string } | null | undefined)?.starts_at;

    if (startsAt) {
      result.set(leadId, startsAt);
    }
  }

  return result;
}

export interface AdminLeadsLoadResult {
  leadsTableAvailable: boolean;
  leads: AdminLeadListRow[];
  summary: AdminLeadsSummary;
}

export async function loadAdminLeads(academyId: string): Promise<AdminLeadsLoadResult> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    return {
      leadsTableAvailable: false,
      leads: [],
      summary: {
        newLeads: 0,
        needsFollowUp: 0,
        trialBooked: 0,
        joinedThisMonth: 0,
      },
    };
  }

  const supabase = getSupabaseAdminClient();
  const archivedColumnAvailable = await checkLeadArchivedColumnAvailable();
  const trackingSelect =
    "id, full_name, email, phone, programme_interest, experience_level, lead_source, status, created_at, updated_at, submitted_at, contacted_at, trial_booked_at, trial_attended_at, joined_at, last_activity_at";

  const { data, error } = archivedColumnAvailable
    ? await supabase
        .from("leads")
        .select(trackingSelect)
        .eq("academy_id", academyId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
    : await supabase
        .from("leads")
        .select(trackingSelect)
        .eq("academy_id", academyId)
        .order("created_at", { ascending: false });

  let rows = (data ?? []) as LeadRecordRow[];

  if (error) {
    if (isMissingLeadTrackingColumnsError(error)) {
      let fallbackQuery = supabase
        .from("leads")
        .select(
          "id, full_name, email, phone, programme_interest, experience_level, lead_source, status, created_at, updated_at",
        )
        .eq("academy_id", academyId)
        .order("created_at", { ascending: false });

      if (archivedColumnAvailable) {
        fallbackQuery = fallbackQuery.is("archived_at", null);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        if (isMissingLeadsTableError(fallbackError)) {
          leadsTableAvailable = false;
          return {
            leadsTableAvailable: false,
            leads: [],
            summary: {
              newLeads: 0,
              needsFollowUp: 0,
              trialBooked: 0,
              joinedThisMonth: 0,
            },
          };
        }

        throw new Error(`Failed to load leads: ${fallbackError.message}`);
      }

      rows = (fallbackData ?? []) as LeadRecordRow[];
    } else if (isMissingLeadsTableError(error)) {
      leadsTableAvailable = false;
      return {
        leadsTableAvailable: false,
        leads: [],
        summary: {
          newLeads: 0,
          needsFollowUp: 0,
          trialBooked: 0,
          joinedThisMonth: 0,
        },
      };
    } else {
      throw new Error(`Failed to load leads: ${error.message}`);
    }
  }

  leadsTableAvailable = true;
  const linkedSessions = await loadLinkedTrialSessionStartsAtByLeadId(rows.map((row) => row.id));
  const leads = rows.map((row) =>
    mapLeadListRow(row, linkedSessions.get(row.id) ?? null),
  );

  return {
    leadsTableAvailable: true,
    leads,
    summary: buildAdminLeadsSummary(leads),
  };
}

export interface AdminArchivedLeadsLoadResult {
  leadsTableAvailable: boolean;
  archivedLeadsAvailable: boolean;
  leads: AdminArchivedLeadListRow[];
}

export async function loadAdminArchivedLeads(
  academyId: string,
): Promise<AdminArchivedLeadsLoadResult> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    return {
      leadsTableAvailable: false,
      archivedLeadsAvailable: false,
      leads: [],
    };
  }

  const archivedColumnAvailable = await checkLeadArchivedColumnAvailable();

  if (!archivedColumnAvailable) {
    return {
      leadsTableAvailable: true,
      archivedLeadsAvailable: false,
      leads: [],
    };
  }

  const supabase = getSupabaseAdminClient();
  const archivedSelect =
    "id, full_name, programme_interest, status, archived_at";

  const { data, error } = await supabase
    .from("leads")
    .select(archivedSelect)
    .eq("academy_id", academyId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) {
    if (isMissingLeadArchivedColumnError(error) || isMissingLeadsTableError(error)) {
      return {
        leadsTableAvailable: !isMissingLeadsTableError(error),
        archivedLeadsAvailable: false,
        leads: [],
      };
    }

    throw new Error(`Failed to load archived leads: ${error.message}`);
  }

  const leads = ((data ?? []) as LeadRecordRow[]).map(mapArchivedLeadListRow);

  return {
    leadsTableAvailable: true,
    archivedLeadsAvailable: true,
    leads,
  };
}

export async function loadAdminLeadDetail(
  academyId: string,
  leadId: string,
): Promise<AdminLeadDetail | null> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const attributionAvailable = await checkLeadAttributionColumnsAvailable();
  const trackingSelect = attributionAvailable
    ? `id, academy_id, full_name, email, phone, programme_interest, experience_level, lead_source, notes, status, created_at, updated_at, submitted_at, contacted_at, trial_booked_at, trial_attended_at, joined_at, last_activity_at, ${LEAD_ATTRIBUTION_SELECT}`
    : "id, academy_id, full_name, email, phone, programme_interest, experience_level, lead_source, notes, status, created_at, updated_at, submitted_at, contacted_at, trial_booked_at, trial_attended_at, joined_at, last_activity_at";
  const baseSelect =
    "id, academy_id, full_name, email, phone, programme_interest, experience_level, lead_source, notes, status, created_at, updated_at";

  let { data, error } = await supabase
    .from("leads")
    .select(trackingSelect)
    .eq("academy_id", academyId)
    .eq("id", leadId)
    .maybeSingle();

  if (error && isMissingLeadAttributionColumnsError(error)) {
    leadAttributionColumnsAvailable = false;
    ({ data, error } = await supabase
      .from("leads")
      .select(
        "id, academy_id, full_name, email, phone, programme_interest, experience_level, lead_source, notes, status, created_at, updated_at, submitted_at, contacted_at, trial_booked_at, trial_attended_at, joined_at, last_activity_at",
      )
      .eq("academy_id", academyId)
      .eq("id", leadId)
      .maybeSingle());
  }

  if (error && isMissingLeadTrackingColumnsError(error)) {
    ({ data, error } = await supabase
      .from("leads")
      .select(baseSelect)
      .eq("academy_id", academyId)
      .eq("id", leadId)
      .maybeSingle());
  }

  if (error) {
    if (isMissingLeadsTableError(error)) {
      leadsTableAvailable = false;
      return null;
    }

    throw new Error(`Failed to load lead: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapLeadDetail(data as unknown as LeadRecordRow);
}

export async function submitLead(input: {
  academyId: string;
  submission: LeadSubmission;
  trialAudience?: TrialAudience;
  attribution?: LeadAttribution;
}): Promise<LeadSubmissionResult> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    throw new Error(LEADS_NOT_CONFIGURED_MESSAGE);
  }

  const submission = parseLeadSubmission(input.submission);
  const now = new Date().toISOString();
  const trackingAvailable = await checkLeadTrackingColumnsAvailable();
  const insertRow = appendAttributionToInsertRow(
    buildLeadInsertRow(
      {
        academy_id: input.academyId,
        full_name: submission.fullName,
        email: submission.email,
        phone: submission.phone || null,
        programme_interest: submission.programmeInterest,
        experience_level: submission.experienceLevel,
        lead_source: submission.leadSource,
        notes: submission.notes || null,
        status: "new_enquiry",
      },
      now,
      trackingAvailable,
    ),
    input.attribution,
  );

  const { data, error } = await insertLeadRow(insertRow);

  if (error) {
    if (isMissingLeadsTableError(error)) {
      leadsTableAvailable = false;
      throw new Error(LEADS_NOT_CONFIGURED_MESSAGE);
    }

    console.error("[leads] submitLead insert failed", {
      academyId: input.academyId,
      email: submission.email,
      trackingAvailable,
      code: error.code,
      message: error.message,
    });
    throw new Error(`Failed to submit enquiry: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to submit enquiry: lead was not created.");
  }

  const leadId = data.id as string;
  const createdAt = data.created_at as string;

  await sendLeadEmailsAfterSubmission({
    academyId: input.academyId,
    leadId,
    fullName: submission.fullName,
    email: submission.email,
    phone: submission.phone || null,
    programmeInterest: submission.programmeInterest,
    experienceLevel: submission.experienceLevel,
    notes: submission.notes || null,
    createdAtIso: createdAt,
    trialAudience: input.trialAudience,
  });

  console.info("[leads] submitLead email dispatch finished", {
    leadId,
    academyId: input.academyId,
  });

  return {
    ok: true,
    leadId,
    message: "Thank you. Your enquiry has been received.",
  };
}

export async function createAdminLead(
  academyId: string,
  input: LeadSubmission & { status?: LeadStatus },
): Promise<{ leadId: string }> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    throw new Error(LEADS_NOT_CONFIGURED_MESSAGE);
  }

  const submission = parseLeadSubmission(input);
  const status = input.status ? parseLeadStatus(input.status) : "new_enquiry";
  const now = new Date().toISOString();
  const trackingAvailable = await checkLeadTrackingColumnsAvailable();
  const statusTimestamps = trackingAvailable
    ? {
        ...(status === "trial_booked" ? { trial_booked_at: now } : {}),
        ...(status === "trial_attended" ? { trial_attended_at: now } : {}),
        ...(status === "joined" ? { joined_at: now } : {}),
      }
    : {};
  const insertRow = buildLeadInsertRow(
    {
      academy_id: academyId,
      full_name: submission.fullName,
      email: submission.email,
      phone: submission.phone || null,
      programme_interest: submission.programmeInterest,
      experience_level: submission.experienceLevel,
      lead_source: submission.leadSource,
      notes: submission.notes || null,
      status,
    },
    now,
    trackingAvailable,
    statusTimestamps,
  );

  const { data, error } = await insertLeadRow(insertRow);

  if (error) {
    if (isMissingLeadsTableError(error)) {
      leadsTableAvailable = false;
      throw new Error(LEADS_NOT_CONFIGURED_MESSAGE);
    }

    throw new Error(`Failed to create lead: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to create lead: lead was not created.");
  }

  return { leadId: data.id as string };
}

export async function updateLeadAdminRecord(input: {
  academyId: string;
  leadId: string;
  fullName: string;
  email: string;
  phone: string;
  programmeInterest: string;
  experienceLevel: string;
  leadSource: string;
  status: LeadStatus;
  notes: string;
}): Promise<void> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    throw new Error(LEADS_NOT_CONFIGURED_MESSAGE);
  }

  const submission = parseLeadSubmission({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    programmeInterest: input.programmeInterest as LeadSubmission["programmeInterest"],
    experienceLevel: input.experienceLevel as LeadSubmission["experienceLevel"],
    leadSource: input.leadSource as LeadSubmission["leadSource"],
    notes: input.notes,
  });
  const status = parseLeadStatus(input.status);
  const supabase = getSupabaseAdminClient();
  const trackingSelect =
    "id, academy_id, full_name, email, phone, programme_interest, experience_level, lead_source, notes, status, created_at, updated_at, submitted_at, contacted_at, trial_booked_at, trial_attended_at, joined_at, last_activity_at";
  const baseSelect =
    "id, academy_id, full_name, email, phone, programme_interest, experience_level, lead_source, notes, status, created_at, updated_at";

  let { data: existingRow, error: existingError } = await supabase
    .from("leads")
    .select(trackingSelect)
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId)
    .maybeSingle();

  if (existingError && isMissingLeadTrackingColumnsError(existingError)) {
    ({ data: existingRow, error: existingError } = await supabase
      .from("leads")
      .select(baseSelect)
      .eq("academy_id", input.academyId)
      .eq("id", input.leadId)
      .maybeSingle());
  }

  if (existingError) {
    throw new Error(`Failed to load lead for update: ${existingError.message}`);
  }

  if (!existingRow) {
    throw new Error("Lead not found.");
  }

  const now = new Date().toISOString();
  const trackingAvailable = await checkLeadTrackingColumnsAvailable();
  const timestampUpdates = buildStatusTimestampUpdates(
    status,
    existingRow as LeadRecordRow,
    now,
    trackingAvailable,
  );

  const { error } = await supabase
    .from("leads")
    .update({
      full_name: submission.fullName,
      email: submission.email,
      phone: submission.phone || null,
      programme_interest: submission.programmeInterest,
      experience_level: submission.experienceLevel,
      lead_source: submission.leadSource,
      status,
      notes: submission.notes || null,
      ...timestampUpdates,
    })
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId);

  if (error) {
    throw new Error(`Failed to update lead: ${error.message}`);
  }
}

export async function deleteLead(input: {
  academyId: string;
  leadId: string;
}): Promise<void> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    throw new Error(LEADS_NOT_CONFIGURED_MESSAGE);
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId);

  if (error) {
    throw new Error(`Failed to delete lead: ${error.message}`);
  }
}

export async function archiveLead(input: {
  academyId: string;
  leadId: string;
}): Promise<void> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    throw new Error(LEADS_NOT_CONFIGURED_MESSAGE);
  }

  const archivedColumnAvailable = await checkLeadArchivedColumnAvailable();

  if (!archivedColumnAvailable) {
    throw new Error(
      "Lead archiving is not set up yet. Please run the database migration.",
    );
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const trackingAvailable = await checkLeadTrackingColumnsAvailable();
  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("id")
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load lead: ${existingError.message}`);
  }

  if (!existing) {
    throw new Error("Lead not found.");
  }

  const updatePayload: {
    archived_at: string;
    updated_at?: string;
    last_activity_at?: string;
  } = {
    archived_at: now,
  };

  if (trackingAvailable) {
    updatePayload.updated_at = now;
    updatePayload.last_activity_at = now;
  }

  const { data: archivedRows, error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId)
    .is("archived_at", null)
    .select("id");

  if (!error && (archivedRows ?? []).length === 0) {
    return;
  }

  if (error) {
    throw new Error(`Failed to archive lead: ${error.message}`);
  }
}

export async function restoreLead(input: {
  academyId: string;
  leadId: string;
}): Promise<void> {
  const tableAvailable = await checkLeadsTableAvailable();

  if (!tableAvailable) {
    throw new Error(LEADS_NOT_CONFIGURED_MESSAGE);
  }

  const archivedColumnAvailable = await checkLeadArchivedColumnAvailable();

  if (!archivedColumnAvailable) {
    throw new Error(
      "Lead archiving is not set up yet. Please run the database migration.",
    );
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const trackingAvailable = await checkLeadTrackingColumnsAvailable();
  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("id")
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load lead: ${existingError.message}`);
  }

  if (!existing) {
    throw new Error("Lead not found.");
  }

  const updatePayload: {
    archived_at: null;
    updated_at?: string;
    last_activity_at?: string;
  } = {
    archived_at: null,
  };

  if (trackingAvailable) {
    updatePayload.updated_at = now;
    updatePayload.last_activity_at = now;
  }

  const { data: restoredRows, error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("academy_id", input.academyId)
    .eq("id", input.leadId)
    .not("archived_at", "is", null)
    .select("id");

  if (!error && (restoredRows ?? []).length === 0) {
    return;
  }

  if (error) {
    throw new Error(`Failed to restore lead: ${error.message}`);
  }
}
