import "server-only";

import {
  ANALYTICS_LEAD_SOURCES,
  formatAnalyticsLeadSourceLabel,
  formatLeadSourceConversionPercent,
  normalizeLeadSourceForAnalytics,
  type AnalyticsLeadSource,
  type LeadSourceAnalyticsPageData,
  type LeadSourceAttributionRecord,
  type LeadSourceFunnelRow,
  type LeadSourceStudentQualityRow,
} from "@/lib/lead-source-analytics.shared";
import { formatLeadStatusLabel } from "@/lib/leads.shared";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

interface LeadAnalyticsRow {
  lead_source: string;
  status: string;
  trial_booked_at: string | null;
  joined_at: string | null;
}

function isMissingAnalyticsSchemaError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes('relation "leads" does not exist') ||
    message.includes('relation "public.leads" does not exist') ||
    message.includes("original_lead_source")
  );
}

function createEmptyCounts(): Record<AnalyticsLeadSource, number> {
  return Object.fromEntries(
    ANALYTICS_LEAD_SOURCES.map((source) => [source, 0]),
  ) as Record<AnalyticsLeadSource, number>;
}

function isTrialBookedLead(row: LeadAnalyticsRow) {
  return (
    row.trial_booked_at !== null ||
    row.status === "trial_booked" ||
    row.status === "trial_attended" ||
    row.status === "joined"
  );
}

function isJoinedLead(row: LeadAnalyticsRow) {
  return row.status === "joined" || row.joined_at !== null;
}

function buildFunnelRows(
  leadCounts: Record<AnalyticsLeadSource, number>,
  trialBookedCounts: Record<AnalyticsLeadSource, number>,
  joinedCounts: Record<AnalyticsLeadSource, number>,
): LeadSourceFunnelRow[] {
  return ANALYTICS_LEAD_SOURCES.map((source) => {
    const leads = leadCounts[source];
    const joined = joinedCounts[source];

    return {
      source,
      sourceLabel: formatAnalyticsLeadSourceLabel(source),
      leads,
      trialBooked: trialBookedCounts[source],
      joined,
      conversionPercent: formatLeadSourceConversionPercent(joined, leads),
    };
  });
}

function buildQualityRows(
  leadCounts: Record<AnalyticsLeadSource, number>,
  memberCounts: Record<AnalyticsLeadSource, number>,
  activeMemberCounts: Record<AnalyticsLeadSource, number>,
): LeadSourceStudentQualityRow[] {
  return ANALYTICS_LEAD_SOURCES.map((source) => ({
    source,
    sourceLabel: formatAnalyticsLeadSourceLabel(source),
    leads: leadCounts[source],
    members: memberCounts[source],
    activeMembers: activeMemberCounts[source],
  }));
}

function sumCounts(counts: Record<AnalyticsLeadSource, number>) {
  return ANALYTICS_LEAD_SOURCES.reduce((total, source) => total + counts[source], 0);
}

export async function loadLeadSourceAnalytics(
  clubId: string,
): Promise<LeadSourceAnalyticsPageData> {
  const supabase = getSupabaseAdminClient();
  const leadCounts = createEmptyCounts();
  const trialBookedCounts = createEmptyCounts();
  const joinedCounts = createEmptyCounts();
  const memberCounts = createEmptyCounts();
  const activeMemberCounts = createEmptyCounts();

  const { data: leadRows, error: leadsError } = await supabase
    .from("leads")
    .select("lead_source, status, trial_booked_at, joined_at")
    .eq("academy_id", clubId);

  if (leadsError) {
    if (isMissingAnalyticsSchemaError(leadsError)) {
      return {
        configured: false,
        funnelRows: [],
        qualityRows: [],
        totals: {
          leads: 0,
          trialBooked: 0,
          joined: 0,
          members: 0,
          activeMembers: 0,
        },
      };
    }

    throw new Error(`Failed to load lead source analytics: ${leadsError.message}`);
  }

  for (const row of (leadRows ?? []) as LeadAnalyticsRow[]) {
    const source = normalizeLeadSourceForAnalytics(row.lead_source);

    if (!source) {
      continue;
    }

    leadCounts[source] += 1;

    if (isTrialBookedLead(row)) {
      trialBookedCounts[source] += 1;
    }

    if (isJoinedLead(row)) {
      joinedCounts[source] += 1;
    }
  }

  const { data: membershipRows, error: membershipsError } = await supabase
    .from("memberships")
    .select("user_id, status, users!inner(original_lead_source)")
    .eq("club_id", clubId);

  if (membershipsError) {
    if (isMissingAnalyticsSchemaError(membershipsError)) {
      return {
        configured: false,
        funnelRows: [],
        qualityRows: [],
        totals: {
          leads: 0,
          trialBooked: 0,
          joined: 0,
          members: 0,
          activeMembers: 0,
        },
      };
    }

    throw new Error(
      `Failed to load student lead source analytics: ${membershipsError.message}`,
    );
  }

  const countedMemberUserIds = new Set<string>();
  const countedActiveMemberUserIds = new Set<string>();

  for (const row of membershipRows ?? []) {
    const membership = row as {
      user_id: string;
      status: string;
      users: { original_lead_source: string | null } | { original_lead_source: string | null }[];
    };
    const userRecord = Array.isArray(membership.users)
      ? membership.users[0]
      : membership.users;
    const source = normalizeLeadSourceForAnalytics(userRecord?.original_lead_source);

    if (!source) {
      continue;
    }

    if (!countedMemberUserIds.has(membership.user_id)) {
      countedMemberUserIds.add(membership.user_id);
      memberCounts[source] += 1;
    }

    if (
      isActiveMembershipStatus(membership.status) &&
      !countedActiveMemberUserIds.has(membership.user_id)
    ) {
      countedActiveMemberUserIds.add(membership.user_id);
      activeMemberCounts[source] += 1;
    }
  }

  const funnelRows = buildFunnelRows(leadCounts, trialBookedCounts, joinedCounts);
  const qualityRows = buildQualityRows(leadCounts, memberCounts, activeMemberCounts);

  return {
    configured: true,
    funnelRows,
    qualityRows,
    totals: {
      leads: sumCounts(leadCounts),
      trialBooked: sumCounts(trialBookedCounts),
      joined: sumCounts(joinedCounts),
      members: sumCounts(memberCounts),
      activeMembers: sumCounts(activeMemberCounts),
    },
  };
}

interface LeadSearchRow {
  id: string;
  full_name: string;
  email: string;
  lead_source: string;
  status: string;
}

interface StudentSearchRow {
  user_id: string;
  users:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        original_lead_source: string | null;
      }
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        original_lead_source: string | null;
      }[];
}

function formatStudentAttributionName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown student";
}

function buildLeadAttributionRecord(row: LeadSearchRow): LeadSourceAttributionRecord | null {
  const originalLeadSource = normalizeLeadSourceForAnalytics(row.lead_source);

  if (!originalLeadSource) {
    return null;
  }

  return {
    id: row.id,
    recordType: "lead",
    name: row.full_name.trim() || "Unknown lead",
    email: row.email?.trim() || null,
    originalLeadSource,
    originalLeadSourceLabel: formatAnalyticsLeadSourceLabel(originalLeadSource),
    statusLabel: formatLeadStatusLabel(row.status),
  };
}

function buildStudentAttributionRecord(
  row: StudentSearchRow,
): LeadSourceAttributionRecord | null {
  const userRecord = Array.isArray(row.users) ? row.users[0] : row.users;
  const originalLeadSource = normalizeLeadSourceForAnalytics(
    userRecord?.original_lead_source,
  );

  if (!originalLeadSource || !userRecord) {
    return null;
  }

  return {
    id: userRecord.id,
    recordType: "student",
    name: formatStudentAttributionName(userRecord.first_name, userRecord.last_name),
    email: userRecord.email?.trim() || null,
    originalLeadSource,
    originalLeadSourceLabel: formatAnalyticsLeadSourceLabel(originalLeadSource),
    statusLabel: "Member",
  };
}

export async function loadLeadSourceAttributionRecords(
  clubId: string,
): Promise<LeadSourceAttributionRecord[]> {
  const supabase = getSupabaseAdminClient();
  const records: LeadSourceAttributionRecord[] = [];

  const { data: leadRows, error: leadsError } = await supabase
    .from("leads")
    .select("id, full_name, email, lead_source, status")
    .eq("academy_id", clubId);

  if (leadsError) {
    if (isMissingAnalyticsSchemaError(leadsError)) {
      return [];
    }

    throw new Error(
      `Failed to load lead source attribution records: ${leadsError.message}`,
    );
  }

  for (const row of (leadRows ?? []) as LeadSearchRow[]) {
    const record = buildLeadAttributionRecord(row);

    if (record) {
      records.push(record);
    }
  }

  const { data: membershipRows, error: membershipsError } = await supabase
    .from("memberships")
    .select(
      "user_id, users!inner(id, first_name, last_name, email, original_lead_source)",
    )
    .eq("club_id", clubId);

  if (membershipsError) {
    if (isMissingAnalyticsSchemaError(membershipsError)) {
      return records;
    }

    throw new Error(
      `Failed to load student lead source attribution records: ${membershipsError.message}`,
    );
  }

  const countedStudentIds = new Set<string>();

  for (const row of (membershipRows ?? []) as StudentSearchRow[]) {
    const userRecord = Array.isArray(row.users) ? row.users[0] : row.users;

    if (!userRecord || countedStudentIds.has(userRecord.id)) {
      continue;
    }

    countedStudentIds.add(userRecord.id);
    const record = buildStudentAttributionRecord(row);

    if (record) {
      records.push(record);
    }
  }

  return records.sort((left, right) =>
    left.name.localeCompare(right.name, "en", { sensitivity: "base" }),
  );
}

/** Persist analytics lead source on the student when a lead converts. Never throws. */
export async function preserveStudentOriginalLeadSource(input: {
  userId: string;
  leadSource: string | null;
}): Promise<void> {
  const analyticsSource = normalizeLeadSourceForAnalytics(input.leadSource);

  if (!analyticsSource) {
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("users")
      .update({ original_lead_source: analyticsSource })
      .eq("id", input.userId)
      .is("original_lead_source", null);

    if (error && !isMissingAnalyticsSchemaError(error)) {
      throw new Error(`Failed to preserve student lead source: ${error.message}`);
    }
  } catch (error) {
    console.error("[lead-source-analytics]", {
      kind: "preserve_student_source",
      userId: input.userId,
      message: error instanceof Error ? error.message : "Preserve lead source failed.",
    });
  }
}
