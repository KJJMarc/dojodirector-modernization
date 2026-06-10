import {
  academyLeadTrackingDedupeKey,
  type AcademyPublicPixelSettings,
} from "@/lib/academy-pixel-settings.shared";
import {
  clubPixelTrackingEventApiPath,
  type GooglePixelTrackingEventType,
  type MetaPixelTrackingEventType,
  type PixelTrackingProvider,
} from "@/lib/academy-pixel-tracking.shared";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function reportAcademyPixelTrackingEvent(
  clubSlug: string,
  provider: PixelTrackingProvider,
  eventType: MetaPixelTrackingEventType | GooglePixelTrackingEventType,
) {
  if (typeof window === "undefined") {
    return;
  }

  void fetch(clubPixelTrackingEventApiPath(clubSlug), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider, eventType }),
    keepalive: true,
  }).catch(() => {
    // Status monitoring is best-effort and must not affect public pages.
  });
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
    reportAcademyPixelTrackingEvent(settings.clubSlug, "meta", "Lead");
  }

  if (settings.googleTrackingEnabled && typeof window.gtag === "function") {
    if (settings.googleAdsConversionSendTo) {
      window.gtag("event", "conversion", {
        send_to: settings.googleAdsConversionSendTo,
      });
      reportAcademyPixelTrackingEvent(settings.clubSlug, "google", "conversion");
    }

    window.gtag("event", "generate_lead");
    reportAcademyPixelTrackingEvent(settings.clubSlug, "google", "generate_lead");
  }
}
