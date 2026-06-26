import "server-only";

import {
  buildAcademyPublicPixelSettings,
  isGoogleAdsTagId,
  isValidGoogleTagId,
  isValidMetaPixelId,
  normalizeGoogleAdsConversionLabel,
  normalizeGoogleTagId,
  normalizeMetaPixelId,
  readKingstonGoogleAdsTrialEnquiryConversionLabelFromEnv,
  resolveGoogleAdsConversionLabelForClub,
  type AcademyPixelSettingsFormState,
  type AcademyPublicPixelSettings,
} from "@/lib/academy-pixel-settings.shared";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";
import { getClubBySlug, requireClubBySlug } from "@/lib/clubs.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface ClubPixelSettingsRow {
  id: string;
  name: string;
  slug: string;
  meta_pixel_enabled: boolean | null;
  meta_pixel_id: string | null;
  google_tracking_enabled: boolean | null;
  google_tag_id: string | null;
  google_ads_conversion_label: string | null;
}

const CLUB_PIXEL_COLUMNS =
  "id, name, slug, meta_pixel_enabled, meta_pixel_id, google_tracking_enabled, google_tag_id, google_ads_conversion_label";

function mapClubPixelFormRow(row: ClubPixelSettingsRow): AcademyPixelSettingsFormState {
  return {
    clubId: row.id,
    clubSlug: row.slug,
    clubName: row.name,
    metaPixelEnabled: row.meta_pixel_enabled ?? false,
    metaPixelId: row.meta_pixel_id?.trim() ?? "",
    googleTrackingEnabled: row.google_tracking_enabled ?? false,
    googleTagId: row.google_tag_id?.trim() ?? "",
    googleAdsConversionLabel: row.google_ads_conversion_label?.trim() ?? "",
  };
}

export async function loadAcademyPixelSettingsForEdit(
  clubSlug: string,
): Promise<AcademyPixelSettingsFormState> {
  const club = await requireClubBySlug(clubSlug);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select(CLUB_PIXEL_COLUMNS)
    .eq("id", club.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load pixel settings: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Club not found for slug "${clubSlug}".`);
  }

  return mapClubPixelFormRow(data as ClubPixelSettingsRow);
}

export async function updateAcademyPixelSettings(input: {
  clubId: string;
  clubSlug: string;
  metaPixelEnabled: boolean;
  metaPixelId: string;
  googleTrackingEnabled: boolean;
  googleTagId: string;
  googleAdsConversionLabel: string;
}): Promise<void> {
  const metaPixelId = normalizeMetaPixelId(input.metaPixelId);
  const googleTagId = normalizeGoogleTagId(input.googleTagId);
  const googleAdsConversionLabel = normalizeGoogleAdsConversionLabel(
    input.googleAdsConversionLabel,
  );

  if (input.metaPixelEnabled && !isValidMetaPixelId(metaPixelId)) {
    console.error("[pixel-settings] validation failed: invalid meta pixel id", {
      clubSlug: input.clubSlug,
      metaPixelId,
    });
    throw new Error("Enter a valid Meta Pixel ID (numeric ID from Events Manager).");
  }

  if (input.googleTrackingEnabled && !isValidGoogleTagId(googleTagId)) {
    console.error("[pixel-settings] validation failed: invalid google tag id", {
      clubSlug: input.clubSlug,
      googleTagId,
    });
    throw new Error(
      "Enter a valid Google tag ID (e.g. G-XXXXXXXX, AW-XXXXXXXX, or GT-XXXXXXXX).",
    );
  }

  const envConversionLabel =
    input.clubSlug === KINGSTON_CLUB_SLUG
      ? readKingstonGoogleAdsTrialEnquiryConversionLabelFromEnv()
      : null;

  if (
    input.googleTrackingEnabled &&
    isGoogleAdsTagId(googleTagId) &&
    !googleAdsConversionLabel &&
    !envConversionLabel
  ) {
    console.error(
      "[pixel-settings] validation failed: missing google ads conversion label",
      {
        clubSlug: input.clubSlug,
        googleTagId,
        hasEnvConversionLabel: Boolean(envConversionLabel),
      },
    );
    throw new Error(
      "Enter the Google Ads conversion label for trial enquiry leads when using an AW- tag ID.",
    );
  }

  const supabase = getSupabaseAdminClient();
  console.info("[pixel-settings] writing club pixel settings", {
    clubSlug: input.clubSlug,
    clubId: input.clubId,
    metaPixelEnabled: input.metaPixelEnabled,
    googleTrackingEnabled: input.googleTrackingEnabled,
  });
  const { error } = await supabase
    .from("clubs")
    .update({
      meta_pixel_enabled: input.metaPixelEnabled,
      meta_pixel_id: input.metaPixelEnabled ? metaPixelId : null,
      google_tracking_enabled: input.googleTrackingEnabled,
      google_tag_id: input.googleTrackingEnabled ? googleTagId : null,
      google_ads_conversion_label:
        input.googleTrackingEnabled && googleAdsConversionLabel
          ? googleAdsConversionLabel
          : null,
    })
    .eq("id", input.clubId);

  if (error) {
    console.error("[pixel-settings] database update failed", {
      clubSlug: input.clubSlug,
      clubId: input.clubId,
      message: error.message,
    });
    throw new Error(`Failed to save pixel settings: ${error.message}`);
  }

  console.info("[pixel-settings] database update succeeded", {
    clubSlug: input.clubSlug,
    clubId: input.clubId,
  });
}

export async function getPublicAcademyPixelSettingsByClubSlug(
  clubSlug: string,
): Promise<AcademyPublicPixelSettings | null> {
  const club = await getClubBySlug(clubSlug);

  if (!club) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select(CLUB_PIXEL_COLUMNS)
    .eq("id", club.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load pixel settings: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as ClubPixelSettingsRow;
  const googleAdsConversionLabel = resolveGoogleAdsConversionLabelForClub({
    clubSlug: row.slug,
    databaseLabel: row.google_ads_conversion_label,
    envLabel: readKingstonGoogleAdsTrialEnquiryConversionLabelFromEnv(),
  });

  return buildAcademyPublicPixelSettings({
    clubSlug: row.slug,
    metaPixelEnabled: row.meta_pixel_enabled ?? false,
    metaPixelId: row.meta_pixel_id,
    googleTrackingEnabled: row.google_tracking_enabled ?? false,
    googleTagId: row.google_tag_id,
    googleAdsConversionLabel,
  });
}
