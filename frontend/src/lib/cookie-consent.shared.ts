import { isGoogleAdsTagId } from "@/lib/academy-pixel-settings.shared";

export const COOKIE_CONSENT_STORAGE_KEY = "dojo-director-cookie-consent";

export const COOKIE_CONSENT_VERSION = "1.0";

export const COOKIE_PREFERENCES_OPEN_EVENT = "dojo:open-cookie-preferences";

export interface CookieConsentPreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

export const DEFAULT_COOKIE_CONSENT: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  timestamp: "",
  version: COOKIE_CONSENT_VERSION,
};

export function isCookieConsentPreferences(
  value: unknown,
): value is CookieConsentPreferences {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.necessary === true &&
    typeof record.analytics === "boolean" &&
    typeof record.marketing === "boolean" &&
    typeof record.timestamp === "string" &&
    typeof record.version === "string"
  );
}

export function buildCookieConsentPreferences(input: {
  analytics: boolean;
  marketing: boolean;
}): CookieConsentPreferences {
  return {
    necessary: true,
    analytics: input.analytics,
    marketing: input.marketing,
    timestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
}

export function canLoadGoogleTagForConsent(
  googleTagId: string,
  analyticsConsent: boolean,
  marketingConsent: boolean,
): boolean {
  if (isGoogleAdsTagId(googleTagId)) {
    return marketingConsent;
  }

  return analyticsConsent;
}

export function canLoadMetaPixelForConsent(marketingConsent: boolean): boolean {
  return marketingConsent;
}
