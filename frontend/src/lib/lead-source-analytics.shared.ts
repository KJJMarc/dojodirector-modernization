import { clubAdminPath } from "@/lib/clubs.shared";

/** Canonical analytics buckets shown on Lead Source Analytics. */
export const ANALYTICS_LEAD_SOURCES = [
  "google_ads",
  "facebook_ads",
  "google_maps",
  "google_search",
  "instagram",
  "referral",
  "website_direct",
  "walk_in",
  "other",
] as const;

export type AnalyticsLeadSource = (typeof ANALYTICS_LEAD_SOURCES)[number];

const LEGACY_LEAD_SOURCE_TO_ANALYTICS: Record<string, AnalyticsLeadSource> = {
  website: "website_direct",
  phone: "other",
  walk_in: "walk_in",
  facebook: "facebook_ads",
  google: "google_search",
  referral: "referral",
  other: "other",
  google_ads: "google_ads",
  facebook_ads: "facebook_ads",
  google_maps: "google_maps",
  google_search: "google_search",
  instagram: "instagram",
  website_direct: "website_direct",
};

export function clubLeadSourceAnalyticsAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "leads/source-analytics");
}

export function normalizeLeadSourceForAnalytics(
  value: string | null | undefined,
): AnalyticsLeadSource | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return LEGACY_LEAD_SOURCE_TO_ANALYTICS[trimmed] ?? "other";
}

export function formatAnalyticsLeadSourceLabel(
  value: AnalyticsLeadSource | string | null | undefined,
): string {
  switch (value) {
    case "google_ads":
      return "Google Ads";
    case "facebook_ads":
      return "Facebook Ads";
    case "google_maps":
      return "Google Maps";
    case "google_search":
      return "Google Search";
    case "instagram":
      return "Instagram";
    case "referral":
      return "Referral";
    case "website_direct":
      return "Website Direct";
    case "walk_in":
      return "Walk-in";
    case "other":
      return "Other";
    default:
      return value?.trim() ? value : "—";
  }
}

export function parseAnalyticsLeadSourceFilter(
  value: string | undefined,
): AnalyticsLeadSource | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return ANALYTICS_LEAD_SOURCES.includes(value as AnalyticsLeadSource)
    ? (value as AnalyticsLeadSource)
    : undefined;
}

export function formatLeadSourceConversionPercent(joined: number, leads: number): string {
  if (leads <= 0) {
    return "—";
  }

  const percent = (joined / leads) * 100;

  return `${percent.toFixed(1)}%`;
}

export interface LeadSourceFunnelRow {
  source: AnalyticsLeadSource;
  sourceLabel: string;
  leads: number;
  trialBooked: number;
  joined: number;
  conversionPercent: string;
}

export interface LeadSourceStudentQualityRow {
  source: AnalyticsLeadSource;
  sourceLabel: string;
  leads: number;
  members: number;
  activeMembers: number;
}

export interface LeadSourceAnalyticsPageData {
  configured: boolean;
  funnelRows: LeadSourceFunnelRow[];
  qualityRows: LeadSourceStudentQualityRow[];
  totals: {
    leads: number;
    trialBooked: number;
    joined: number;
    members: number;
    activeMembers: number;
  };
}
