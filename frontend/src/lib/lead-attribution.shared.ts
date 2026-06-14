import type { AnalyticsLeadSource } from "@/lib/lead-source-analytics.shared";

export const LEAD_ATTRIBUTION_FIELD_MAX_LENGTH = 500;

export const LEAD_ATTRIBUTION_FORM_FIELDS = [
  "gclid",
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer_url",
] as const;

export type LeadAttributionFormField = (typeof LEAD_ATTRIBUTION_FORM_FIELDS)[number];

export interface LeadAttribution {
  gclid: string | null;
  fbclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer_url: string | null;
}

export const EMPTY_LEAD_ATTRIBUTION: LeadAttribution = {
  gclid: null,
  fbclid: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  referrer_url: null,
};

const OWN_HOSTS = new Set(["dojodirector.com", "www.dojodirector.com"]);

const GOOGLE_SOURCE_VALUES = new Set(["google", "google_ads", "adwords"]);
const META_SOURCE_VALUES = new Set(["facebook", "fb", "meta", "instagram", "ig"]);
const PAID_MEDIUM_VALUES = new Set([
  "cpc",
  "ppc",
  "paid",
  "paidsearch",
  "paidsocial",
  "social",
]);
const SEARCH_ENGINE_HOSTS = [
  "google.",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "ecosia.org",
  "ask.com",
  "baidu.com",
];

function normalizeToken(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase();
}

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function sanitizeLeadAttributionField(
  value: string | null | undefined,
): string | null {
  const trimmed = stripControlCharacters(String(value ?? "").trim());

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, LEAD_ATTRIBUTION_FIELD_MAX_LENGTH);
}

export function sanitizeLeadAttribution(
  input: Partial<Record<LeadAttributionFormField, string | null | undefined>>,
): LeadAttribution {
  return {
    gclid: sanitizeLeadAttributionField(input.gclid),
    fbclid: sanitizeLeadAttributionField(input.fbclid),
    utm_source: sanitizeLeadAttributionField(input.utm_source),
    utm_medium: sanitizeLeadAttributionField(input.utm_medium),
    utm_campaign: sanitizeLeadAttributionField(input.utm_campaign),
    utm_content: sanitizeLeadAttributionField(input.utm_content),
    utm_term: sanitizeLeadAttributionField(input.utm_term),
    referrer_url: sanitizeReferrerUrl(input.referrer_url),
  };
}

export function sanitizeReferrerUrl(value: string | null | undefined): string | null {
  const trimmed = sanitizeLeadAttributionField(value);

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return `${url.origin}${url.pathname}${url.search}`.slice(
      0,
      LEAD_ATTRIBUTION_FIELD_MAX_LENGTH,
    );
  } catch {
    return null;
  }
}

export function leadAttributionSessionKey(clubSlug: string) {
  return `dojo_attribution_${clubSlug.trim().toLowerCase()}`;
}

export function hasLeadAttributionData(attribution: LeadAttribution): boolean {
  return LEAD_ATTRIBUTION_FORM_FIELDS.some((field) => Boolean(attribution[field]));
}

function isPaidGoogleAttribution(attribution: LeadAttribution): boolean {
  const source = normalizeToken(attribution.utm_source);
  const medium = normalizeToken(attribution.utm_medium);

  if (source && GOOGLE_SOURCE_VALUES.has(source)) {
    return true;
  }

  return Boolean(medium && PAID_MEDIUM_VALUES.has(medium) && source && GOOGLE_SOURCE_VALUES.has(source));
}

function isPaidMetaAttribution(attribution: LeadAttribution): boolean {
  const source = normalizeToken(attribution.utm_source);
  const medium = normalizeToken(attribution.utm_medium);

  if (source && META_SOURCE_VALUES.has(source) && medium && PAID_MEDIUM_VALUES.has(medium)) {
    return true;
  }

  return Boolean(source && META_SOURCE_VALUES.has(source) && medium === "cpc");
}

function referrerHostname(referrerUrl: string | null): string | null {
  if (!referrerUrl) {
    return null;
  }

  try {
    return new URL(referrerUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isOwnHost(hostname: string | null): boolean {
  if (!hostname) {
    return false;
  }

  return OWN_HOSTS.has(hostname);
}

function isSearchEngineReferrer(hostname: string | null): boolean {
  if (!hostname) {
    return false;
  }

  return SEARCH_ENGINE_HOSTS.some(
    (pattern) =>
      hostname === pattern.replace(/\.$/, "") ||
      (pattern.endsWith(".") && hostname.includes(pattern)),
  );
}

function isExternalReferrer(hostname: string | null): boolean {
  return Boolean(hostname && !isOwnHost(hostname));
}

/**
 * Derives the analytics lead source bucket from captured attribution signals.
 * Priority: Google Ads > Meta Ads > Organic Search > Referral > Direct / Unknown.
 */
export function classifyLeadAttribution(
  attribution: LeadAttribution,
): AnalyticsLeadSource {
  if (attribution.gclid || isPaidGoogleAttribution(attribution)) {
    return "google_ads";
  }

  if (attribution.fbclid || isPaidMetaAttribution(attribution)) {
    return "facebook_ads";
  }

  const medium = normalizeToken(attribution.utm_medium);
  const referrerHost = referrerHostname(attribution.referrer_url);

  if (medium === "organic" || isSearchEngineReferrer(referrerHost)) {
    return "google_search";
  }

  if (isExternalReferrer(referrerHost) && !isSearchEngineReferrer(referrerHost)) {
    return "referral";
  }

  return "website_direct";
}

export function parseLeadAttributionFromFormData(formData: FormData): LeadAttribution {
  return sanitizeLeadAttribution({
    gclid: String(formData.get("gclid") ?? ""),
    fbclid: String(formData.get("fbclid") ?? ""),
    utm_source: String(formData.get("utm_source") ?? ""),
    utm_medium: String(formData.get("utm_medium") ?? ""),
    utm_campaign: String(formData.get("utm_campaign") ?? ""),
    utm_content: String(formData.get("utm_content") ?? ""),
    utm_term: String(formData.get("utm_term") ?? ""),
    referrer_url: String(formData.get("referrer_url") ?? ""),
  });
}

export function formatLeadAttributionFieldLabel(field: LeadAttributionFormField): string {
  switch (field) {
    case "gclid":
      return "GCLID";
    case "fbclid":
      return "FBCLID";
    case "utm_source":
      return "UTM Source";
    case "utm_medium":
      return "UTM Medium";
    case "utm_campaign":
      return "UTM Campaign";
    case "utm_content":
      return "UTM Content";
    case "utm_term":
      return "UTM Term";
    case "referrer_url":
      return "Referrer";
    default:
      return field;
  }
}
