"use client";

import {
  EMPTY_LEAD_ATTRIBUTION,
  LEAD_ATTRIBUTION_FORM_FIELDS,
  leadAttributionSessionKey,
  sanitizeLeadAttribution,
  sanitizeReferrerUrl,
  type LeadAttribution,
  type LeadAttributionFormField,
} from "@/lib/lead-attribution.shared";

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function readAttributionFromSearchParams(search: string): Partial<LeadAttribution> {
  const params = new URLSearchParams(search);

  return {
    gclid: params.get("gclid"),
    fbclid: params.get("fbclid"),
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
  };
}

function readStoredAttribution(clubSlug: string): LeadAttribution | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(leadAttributionSessionKey(clubSlug));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<LeadAttributionFormField, string>>;
    return sanitizeLeadAttribution(parsed);
  } catch {
    sessionStorage.removeItem(leadAttributionSessionKey(clubSlug));
    return null;
  }
}

function writeStoredAttribution(clubSlug: string, attribution: LeadAttribution) {
  sessionStorage.setItem(leadAttributionSessionKey(clubSlug), JSON.stringify(attribution));
}

function mergeAttribution(
  existing: LeadAttribution | null,
  incoming: Partial<LeadAttribution>,
  referrerUrl: string | null,
): LeadAttribution {
  const base = existing ?? EMPTY_LEAD_ATTRIBUTION;

  const merged: Partial<Record<LeadAttributionFormField, string | null>> = {
    gclid: base.gclid ?? incoming.gclid ?? null,
    fbclid: base.fbclid ?? incoming.fbclid ?? null,
    utm_source: base.utm_source ?? incoming.utm_source ?? null,
    utm_medium: base.utm_medium ?? incoming.utm_medium ?? null,
    utm_campaign: base.utm_campaign ?? incoming.utm_campaign ?? null,
    utm_content: base.utm_content ?? incoming.utm_content ?? null,
    utm_term: base.utm_term ?? incoming.utm_term ?? null,
    referrer_url: base.referrer_url ?? referrerUrl,
  };

  if (incoming.gclid) {
    merged.gclid = incoming.gclid;
  }

  if (incoming.fbclid) {
    merged.fbclid = incoming.fbclid;
  }

  for (const param of UTM_PARAMS) {
    if (incoming[param] && !base[param]) {
      merged[param] = incoming[param] ?? null;
    }
  }

  return sanitizeLeadAttribution(merged);
}

/** Capture first-touch attribution for a club public session. */
export function captureLeadAttributionForClub(clubSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  const incoming = readAttributionFromSearchParams(window.location.search);
  const referrerUrl = sanitizeReferrerUrl(document.referrer || null);
  const existing = readStoredAttribution(clubSlug);
  const merged = mergeAttribution(existing, incoming, referrerUrl);

  writeStoredAttribution(clubSlug, merged);
}

/** Read attribution captured for this club session (for trial enquiry forms). */
export function readLeadAttributionForClub(clubSlug: string): LeadAttribution {
  if (typeof window === "undefined") {
    return EMPTY_LEAD_ATTRIBUTION;
  }

  const stored = readStoredAttribution(clubSlug);

  if (stored) {
    return stored;
  }

  const incoming = readAttributionFromSearchParams(window.location.search);
  const referrerUrl = sanitizeReferrerUrl(document.referrer || null);

  return mergeAttribution(null, incoming, referrerUrl);
}

export function leadAttributionFieldNames(): readonly LeadAttributionFormField[] {
  return LEAD_ATTRIBUTION_FORM_FIELDS;
}
