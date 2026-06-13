import { clubAdminPath, KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

export interface AcademyPixelSettingsFormState {
  clubId: string;
  clubSlug: string;
  clubName: string;
  metaPixelEnabled: boolean;
  metaPixelId: string;
  googleTrackingEnabled: boolean;
  googleTagId: string;
  googleAdsConversionLabel: string;
}

/** Safe subset exposed to public academy pages for script loading. */
export interface AcademyPublicPixelSettings {
  clubSlug: string;
  metaPixelEnabled: boolean;
  metaPixelId: string | null;
  googleTrackingEnabled: boolean;
  googleTagId: string | null;
  googleAdsConversionSendTo: string | null;
}

export const META_PIXEL_ID_HELP =
  "Find this in Meta Events Manager → Data Sources → Pixel.";

export const GOOGLE_TAG_ID_HELP =
  "Find this in Google Ads or GA4 → Data stream / Google tag (e.g. G-XXXXXXXX or AW-XXXXXXXX).";

export const GOOGLE_ADS_CONVERSION_LABEL_HELP =
  "Required for Google Ads (AW-XXXXXXXX) tags. Paste the conversion label from your trial enquiry conversion action (or the full AW-XXXXXXXX/label send_to value). For Kingston, this can also be supplied via NEXT_PUBLIC_GOOGLE_ADS_TRIAL_ENQUIRY_CONVERSION_LABEL in Vercel.";

/** Vercel env var for Kingston trial enquiry Google Ads conversion label (no hard-coded label in code). */
export const KINGSTON_GOOGLE_ADS_TRIAL_ENQUIRY_CONVERSION_LABEL_ENV_KEY =
  "NEXT_PUBLIC_GOOGLE_ADS_TRIAL_ENQUIRY_CONVERSION_LABEL";

export const PIXEL_SETTINGS_TESTING_NOTES = [
  "Install Meta Pixel Helper (Chrome) and confirm PageView on a public academy page.",
  "Use Google Tag Assistant to verify your Google tag loads and records page views.",
  "Submit a test trial enquiry and confirm a single Lead event (Meta) and lead conversion/generate_lead (Google).",
  "Refresh the thank-you state or resubmit — lead events should not fire again for the same submission.",
] as const;

export function clubAcademyPixelSettingsPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "academy-pages/pixel-settings");
}

export function normalizeMetaPixelId(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function normalizeGoogleTagId(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function normalizeGoogleAdsConversionLabel(value: string) {
  return value.trim();
}

export function readKingstonGoogleAdsTrialEnquiryConversionLabelFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const label = normalizeGoogleAdsConversionLabel(
    env[KINGSTON_GOOGLE_ADS_TRIAL_ENQUIRY_CONVERSION_LABEL_ENV_KEY] ?? "",
  );

  return label || null;
}

/**
 * Resolves the Google Ads conversion label for public tracking.
 * Database value wins; Kingston falls back to the Vercel env var when unset.
 */
export function resolveGoogleAdsConversionLabelForClub(input: {
  clubSlug: string;
  databaseLabel: string | null;
  envLabel?: string | null;
}): string | null {
  const database = normalizeGoogleAdsConversionLabel(input.databaseLabel ?? "");

  if (database) {
    return database;
  }

  if (input.clubSlug === KINGSTON_CLUB_SLUG && input.envLabel) {
    return input.envLabel;
  }

  return null;
}

export function isValidMetaPixelId(value: string) {
  const normalized = normalizeMetaPixelId(value);
  return /^\d{5,20}$/.test(normalized);
}

export function isValidGoogleTagId(value: string) {
  const normalized = normalizeGoogleTagId(value);
  return /^(G|AW|GT)-[A-Z0-9]+$/i.test(normalized);
}

export function isGoogleAdsTagId(value: string) {
  return /^AW-/i.test(normalizeGoogleTagId(value));
}

/** Describes which lead conversion events to fire after a successful trial enquiry. */
export interface AcademyLeadConversionEventPlan {
  metaLead: boolean;
  /** Google Ads `conversion` event with send_to — only when an AW- tag and label are configured. */
  googleAdsConversion: boolean;
  /** GA4 `generate_lead` — all enabled Google tags (AW- and G-). */
  googleGenerateLead: boolean;
  googleAdsConversionSendTo: string | null;
}

export function buildAcademyLeadConversionEventPlan(
  settings: AcademyPublicPixelSettings,
): AcademyLeadConversionEventPlan {
  const googleAdsConversionSendTo = settings.googleAdsConversionSendTo;

  return {
    metaLead: Boolean(settings.metaPixelEnabled && settings.metaPixelId),
    googleAdsConversion: Boolean(
      settings.googleTrackingEnabled && googleAdsConversionSendTo,
    ),
    googleGenerateLead: Boolean(
      settings.googleTrackingEnabled && settings.googleTagId,
    ),
    googleAdsConversionSendTo,
  };
}

export function buildGoogleAdsConversionSendTo(
  googleTagId: string,
  conversionLabel: string,
): string | null {
  const tagId = normalizeGoogleTagId(googleTagId);
  const label = normalizeGoogleAdsConversionLabel(conversionLabel);

  if (!label) {
    return null;
  }

  if (label.includes("/") && /^AW-/i.test(label)) {
    return label;
  }

  if (/^AW-/i.test(tagId)) {
    return `${tagId}/${label}`;
  }

  return null;
}

export function buildAcademyPublicPixelSettings(input: {
  clubSlug: string;
  metaPixelEnabled: boolean;
  metaPixelId: string | null;
  googleTrackingEnabled: boolean;
  googleTagId: string | null;
  googleAdsConversionLabel: string | null;
}): AcademyPublicPixelSettings | null {
  const metaPixelId =
    input.metaPixelEnabled && input.metaPixelId && isValidMetaPixelId(input.metaPixelId)
      ? normalizeMetaPixelId(input.metaPixelId)
      : null;
  const googleTagId =
    input.googleTrackingEnabled &&
    input.googleTagId &&
    isValidGoogleTagId(input.googleTagId)
      ? normalizeGoogleTagId(input.googleTagId)
      : null;

  if (!metaPixelId && !googleTagId) {
    return null;
  }

  return {
    clubSlug: input.clubSlug,
    metaPixelEnabled: Boolean(metaPixelId),
    metaPixelId,
    googleTrackingEnabled: Boolean(googleTagId),
    googleTagId,
    googleAdsConversionSendTo:
      googleTagId && input.googleAdsConversionLabel
        ? buildGoogleAdsConversionSendTo(
            googleTagId,
            input.googleAdsConversionLabel,
          )
        : null,
  };
}

export function academyLeadTrackingDedupeKey(clubSlug: string, leadId: string) {
  return `dojo_pixel_lead_${clubSlug.trim().toLowerCase()}_${leadId}`;
}
