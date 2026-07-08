import type { LeadExperienceLevel, LeadProgrammeInterest, LeadStatus, StoredLeadSource } from "@/lib/leads.shared";

export interface LeadMatchTimestamps {
  created_at?: string | null;
}

/** Prefer the oldest non-archived lead when duplicates share email or phone. */
export function pickCanonicalLeadMatch<T extends LeadMatchTimestamps>(
  matches: readonly T[],
): T | null {
  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0] ?? null;
  }

  return [...matches].sort((left, right) => {
    const leftTime = Date.parse(left.created_at ?? "");
    const rightTime = Date.parse(right.created_at ?? "");

    return (Number.isNaN(leftTime) ? 0 : leftTime) - (Number.isNaN(rightTime) ? 0 : rightTime);
  })[0] ?? null;
}

const GENERIC_LEAD_SOURCES = new Set(["website", "website_direct", "other"]);

export function isGenericLeadSource(source: string | null | undefined) {
  const normalized = source?.trim().toLowerCase() ?? "";

  return !normalized || GENERIC_LEAD_SOURCES.has(normalized);
}

export function mergeLeadProgrammeInterest(
  existing: string,
  incoming: LeadProgrammeInterest,
): LeadProgrammeInterest {
  if (existing === "not_sure" && incoming !== "not_sure") {
    return incoming;
  }

  return existing as LeadProgrammeInterest;
}

export function mergeLeadExperienceLevel(
  existing: string,
  incoming: LeadExperienceLevel,
): LeadExperienceLevel {
  if (existing === "not_sure" && incoming !== "not_sure") {
    return incoming;
  }

  return existing as LeadExperienceLevel;
}

export function mergeLeadSource(existing: string, incoming: StoredLeadSource): string {
  const existingNormalized = existing.trim().toLowerCase();
  const incomingNormalized = incoming.trim().toLowerCase();

  if (!existingNormalized) {
    return incomingNormalized;
  }

  if (existingNormalized === incomingNormalized) {
    return existingNormalized;
  }

  if (isGenericLeadSource(existingNormalized) && !isGenericLeadSource(incomingNormalized)) {
    return incomingNormalized;
  }

  return existingNormalized;
}

const LEAD_STATUS_RANK: Record<LeadStatus, number> = {
  new_enquiry: 0,
  trial_booked: 1,
  trial_missed: 1,
  trial_attended: 2,
  joined: 3,
};

export function mergeLeadStatusOnRepeatEnquiry(
  existingStatus: string,
  incomingStatus: LeadStatus,
): LeadStatus {
  const existing = normalizeLeadStatusForMerge(existingStatus);
  const existingRank = LEAD_STATUS_RANK[existing] ?? 0;
  const incomingRank = LEAD_STATUS_RANK[incomingStatus] ?? 0;

  return incomingRank > existingRank ? incomingStatus : existing;
}

function normalizeLeadStatusForMerge(status: string): LeadStatus {
  const normalized = status.trim().toLowerCase();

  if (normalized === "new" || normalized === "contacted") {
    return "new_enquiry";
  }

  if (
    normalized === "trial_booked" ||
    normalized === "trial_attended" ||
    normalized === "trial_missed" ||
    normalized === "joined" ||
    normalized === "new_enquiry"
  ) {
    return normalized as LeadStatus;
  }

  return "new_enquiry";
}

export function mergeLeadPhone(existing: string | null, incoming: string | null) {
  const existingTrimmed = existing?.trim() ?? "";

  if (existingTrimmed) {
    return existingTrimmed;
  }

  return incoming?.trim() || null;
}

export function buildRepeatEnquiryNote(notes: string, timestampIso: string) {
  const trimmed = notes.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(timestampIso);

  const label = Number.isNaN(date.getTime())
    ? timestampIso
    : new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);

  return `[${label}] Repeat enquiry: ${trimmed}`;
}
