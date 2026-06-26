"use server";

import { revalidatePath } from "next/cache";
import { updateAcademyPixelSettings } from "@/lib/academy-pixel-settings.server";
import { clubAcademyPixelSettingsPath } from "@/lib/academy-pixel-settings.shared";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { clubAcademyPagesAdminPath } from "@/lib/admin-academy-pages.shared";
import {
  clubAdminPath,
  clubBookingPath,
  clubJuniorBeltRankingsPath,
  clubTrialEnquiryPath,
} from "@/lib/clubs.shared";

export async function saveAcademyPixelSettingsAction(formData: FormData) {
  const clubSlug = String(formData.get("clubSlug") ?? "").trim();
  const { club } = await requireAdminAccessForClubSlug(clubSlug);

  const payload = {
    clubId: club.id,
    clubSlug: club.slug,
    metaPixelEnabled: formData.get("metaPixelEnabled") === "on",
    metaPixelId: String(formData.get("metaPixelId") ?? ""),
    googleTrackingEnabled: formData.get("googleTrackingEnabled") === "on",
    googleTagId: String(formData.get("googleTagId") ?? ""),
    googleAdsConversionLabel: String(formData.get("googleAdsConversionLabel") ?? ""),
  };

  console.info("[pixel-settings] save action received", {
    clubSlug: payload.clubSlug,
    metaPixelEnabled: payload.metaPixelEnabled,
    metaPixelIdLength: payload.metaPixelId.trim().length,
    googleTrackingEnabled: payload.googleTrackingEnabled,
    googleTagId: payload.googleTagId.trim(),
    googleAdsConversionLabelLength: payload.googleAdsConversionLabel.trim().length,
  });

  try {
    await updateAcademyPixelSettings(payload);
    console.info("[pixel-settings] save action succeeded", {
      clubSlug: payload.clubSlug,
    });
  } catch (error) {
    console.error("[pixel-settings] save action failed", {
      clubSlug: payload.clubSlug,
      message: error instanceof Error ? error.message : "unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  revalidatePath(clubAcademyPagesAdminPath(club.slug));
  revalidatePath(clubAcademyPixelSettingsPath(club.slug));
  revalidatePath(clubBookingPath(club.slug));
  revalidatePath(clubTrialEnquiryPath(club.slug));
  revalidatePath(clubJuniorBeltRankingsPath(club.slug));
  revalidatePath(clubAdminPath(club.slug, "academy-pages"));
  revalidatePath("/adult-belt-rankings");
  revalidatePath("/student-of-the-year");
}
