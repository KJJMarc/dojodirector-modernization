import {
  buildCookieConsentPreferences,
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  type CookieConsentPreferences,
  DEFAULT_COOKIE_CONSENT,
  isCookieConsentPreferences,
} from "@/lib/cookie-consent.shared";

export function readCookieConsentFromStorage(): CookieConsentPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      !isCookieConsentPreferences(parsed) ||
      parsed.version !== COOKIE_CONSENT_VERSION
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeCookieConsentToStorage(input: {
  analytics: boolean;
  marketing: boolean;
}): CookieConsentPreferences {
  const preferences = buildCookieConsentPreferences(input);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(preferences),
    );
    window.dispatchEvent(new CustomEvent("dojo:cookie-consent-changed"));
  }

  return preferences;
}

export function hasStoredCookieConsent(): boolean {
  return readCookieConsentFromStorage() !== null;
}

export function getAnalyticsConsent(): boolean {
  return readCookieConsentFromStorage()?.analytics ?? DEFAULT_COOKIE_CONSENT.analytics;
}

export function getMarketingConsent(): boolean {
  return readCookieConsentFromStorage()?.marketing ?? DEFAULT_COOKIE_CONSENT.marketing;
}
