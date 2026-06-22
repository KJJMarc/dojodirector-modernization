"use client";

import { useEffect } from "react";
import type { AcademyPublicPixelSettings } from "@/lib/academy-pixel-settings.shared";
import { reportAcademyPixelTrackingEvent } from "@/lib/academy-pixel-tracking.client";
import {
  canLoadGoogleTagForConsent,
  canLoadMetaPixelForConsent,
} from "@/lib/cookie-consent.shared";

interface PublicAcademyPixelEventReporterProps {
  settings: AcademyPublicPixelSettings;
  analyticsConsent: boolean;
  marketingConsent: boolean;
}

function waitForTrackingFunction(
  getFn: () => boolean,
  onReady: () => void,
  maxAttempts = 24,
  intervalMs = 250,
) {
  let attempts = 0;

  const intervalId = window.setInterval(() => {
    attempts += 1;

    if (getFn()) {
      window.clearInterval(intervalId);
      onReady();
      return;
    }

    if (attempts >= maxAttempts) {
      window.clearInterval(intervalId);
    }
  }, intervalMs);

  return () => {
    window.clearInterval(intervalId);
  };
}

export function PublicAcademyPixelEventReporter({
  settings,
  analyticsConsent,
  marketingConsent,
}: PublicAcademyPixelEventReporterProps) {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    if (
      settings.metaPixelEnabled &&
      settings.metaPixelId &&
      canLoadMetaPixelForConsent(marketingConsent)
    ) {
      cleanups.push(
        waitForTrackingFunction(
          () => typeof window.fbq === "function",
          () => {
            reportAcademyPixelTrackingEvent(settings.clubSlug, "meta", "PageView");
          },
        ),
      );
    }

    if (
      settings.googleTrackingEnabled &&
      settings.googleTagId &&
      canLoadGoogleTagForConsent(
        settings.googleTagId,
        analyticsConsent,
        marketingConsent,
      )
    ) {
      cleanups.push(
        waitForTrackingFunction(
          () => typeof window.gtag === "function",
          () => {
            reportAcademyPixelTrackingEvent(settings.clubSlug, "google", "page_view");
          },
        ),
      );
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [
    analyticsConsent,
    marketingConsent,
    settings.clubSlug,
    settings.googleTagId,
    settings.googleTrackingEnabled,
    settings.metaPixelEnabled,
    settings.metaPixelId,
  ]);

  return null;
}
