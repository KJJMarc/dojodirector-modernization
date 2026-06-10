import { clubAdminPath } from "@/lib/clubs.shared";

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
  "Optional. Google Ads conversion label for trial enquiry leads (combined with an AW- tag ID as send_to).";

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

export function isValidMetaPixelId(value: string) {
  const normalized = normalizeMetaPixelId(value);
  return /^\d{5,20}$/.test(normalized);
}

export function isValidGoogleTagId(value: string) {
  const normalized = normalizeGoogleTagId(value);
  return /^(G|AW|GT)-[A-Z0-9]+$/i.test(normalized);
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
