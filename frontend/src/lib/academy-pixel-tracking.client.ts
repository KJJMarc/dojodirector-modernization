import {
  academyLeadTrackingDedupeKey,
  type AcademyPublicPixelSettings,
} from "@/lib/academy-pixel-settings.shared";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackAcademyLeadConversion(
  settings: AcademyPublicPixelSettings,
  options: { clubSlug: string; leadId: string },
) {
  if (typeof window === "undefined") {
    return;
  }

  const dedupeKey = academyLeadTrackingDedupeKey(options.clubSlug, options.leadId);

  if (sessionStorage.getItem(dedupeKey)) {
    return;
  }

  sessionStorage.setItem(dedupeKey, "1");

  if (settings.metaPixelEnabled && settings.metaPixelId && typeof window.fbq === "function") {
    window.fbq("track", "Lead");
  }

  if (settings.googleTrackingEnabled && typeof window.gtag === "function") {
    if (settings.googleAdsConversionSendTo) {
      window.gtag("event", "conversion", {
        send_to: settings.googleAdsConversionSendTo,
      });
    }

    window.gtag("event", "generate_lead");
  }
}
