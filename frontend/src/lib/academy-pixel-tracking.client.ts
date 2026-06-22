import {
  academyLeadTrackingDedupeKey,
  buildAcademyLeadConversionEventPlan,
  isGoogleAdsTagId,
  type AcademyPublicPixelSettings,
} from "@/lib/academy-pixel-settings.shared";
import {
  getAnalyticsConsent,
  getMarketingConsent,
} from "@/lib/cookie-consent.client";
import {
  canLoadGoogleTagForConsent,
  canLoadMetaPixelForConsent,
} from "@/lib/cookie-consent.shared";
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

function waitForClientTrackingFunction(
  getFn: () => boolean,
  maxAttempts = 40,
  intervalMs = 250,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (getFn()) {
      resolve(true);
      return;
    }

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;

      if (getFn()) {
        window.clearInterval(intervalId);
        resolve(true);
        return;
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(intervalId);
        resolve(false);
      }
    }, intervalMs);
  });
}

/**
 * Fires the Google Ads trial enquiry conversion event via gtag.
 * Requires send_to in the form AW-XXXXXXXX/conversion_label.
 */
export function fireGoogleAdsTrialEnquiryConversion(
  sendTo: string,
  clubSlug: string,
): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return false;
  }

  window.gtag("event", "conversion", {
    send_to: sendTo,
  });
  reportAcademyPixelTrackingEvent(clubSlug, "google", "conversion");
  return true;
}

/** Fires the GA4/Google Ads generate_lead event via gtag. */
export function fireGoogleGenerateLeadEvent(clubSlug: string): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return false;
  }

  window.gtag("event", "generate_lead");
  reportAcademyPixelTrackingEvent(clubSlug, "google", "generate_lead");
  return true;
}

/**
 * Fires Meta Lead and Google lead conversion events after a successful trial enquiry.
 *
 * Called only from `TrialEnquiryForm` once the `/api/[clubSlug]/trial-enquiry` POST
 * returns `{ ok: true, leadId }`. Never called on page load, validation errors, or
 * failed API requests.
 *
 * Duplicate prevention: sessionStorage key `dojo_pixel_lead_{clubSlug}_{leadId}` is set
 * only after events are successfully sent, so refresh/back on the thank-you state does
 * not re-fire for the same lead submission.
 */
export async function trackAcademyLeadConversion(
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

  const plan = buildAcademyLeadConversionEventPlan(settings);
  const analyticsConsent = getAnalyticsConsent();
  const marketingConsent = getMarketingConsent();
  const googleTagId = settings.googleTagId;
  const canLoadGoogleTag =
    Boolean(googleTagId) &&
    canLoadGoogleTagForConsent(googleTagId!, analyticsConsent, marketingConsent);
  const canFireGoogleGenerateLead =
    canLoadGoogleTag &&
    Boolean(
      googleTagId &&
        (isGoogleAdsTagId(googleTagId) ? marketingConsent : analyticsConsent),
    );
  let firedAny = false;

  if (plan.metaLead && canLoadMetaPixelForConsent(marketingConsent)) {
    const metaReady = await waitForClientTrackingFunction(
      () => typeof window.fbq === "function",
    );

    if (metaReady) {
      window.fbq!("track", "Lead");
      reportAcademyPixelTrackingEvent(settings.clubSlug, "meta", "Lead");
      firedAny = true;
    }
  }

  if (
    (plan.googleGenerateLead || plan.googleAdsConversion) &&
    canLoadGoogleTag
  ) {
    const googleReady = await waitForClientTrackingFunction(
      () => typeof window.gtag === "function",
    );

    if (googleReady) {
      // Google Ads (AW-XXXXXXXX): dedicated conversion action for campaign optimisation.
      if (plan.googleAdsConversion && plan.googleAdsConversionSendTo && marketingConsent) {
        fireGoogleAdsTrialEnquiryConversion(
          plan.googleAdsConversionSendTo,
          settings.clubSlug,
        );
      }

      // GA4 (G-XXXXXXXX) and Google Ads: recommended lead event for reporting.
      if (plan.googleGenerateLead && canFireGoogleGenerateLead) {
        fireGoogleGenerateLeadEvent(settings.clubSlug);
      }

      firedAny = true;
    }
  }

  if (firedAny) {
    sessionStorage.setItem(dedupeKey, "1");
  }
}
