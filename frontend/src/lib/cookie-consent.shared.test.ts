import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCookieConsentPreferences,
  canLoadGoogleTagForConsent,
  canLoadMetaPixelForConsent,
  COOKIE_CONSENT_VERSION,
  isCookieConsentPreferences,
} from "@/lib/cookie-consent.shared";

test("buildCookieConsentPreferences always keeps necessary cookies enabled", () => {
  const preferences = buildCookieConsentPreferences({
    analytics: true,
    marketing: false,
  });

  assert.equal(preferences.necessary, true);
  assert.equal(preferences.analytics, true);
  assert.equal(preferences.marketing, false);
  assert.equal(preferences.version, COOKIE_CONSENT_VERSION);
  assert.ok(preferences.timestamp);
});

test("isCookieConsentPreferences validates stored consent shape", () => {
  assert.equal(
    isCookieConsentPreferences({
      necessary: true,
      analytics: false,
      marketing: true,
      timestamp: "2026-06-19T12:00:00.000Z",
      version: COOKIE_CONSENT_VERSION,
    }),
    true,
  );
  assert.equal(isCookieConsentPreferences({ necessary: false }), false);
});

test("google and meta consent gates map to tag families", () => {
  assert.equal(canLoadMetaPixelForConsent(false), false);
  assert.equal(canLoadMetaPixelForConsent(true), true);
  assert.equal(
    canLoadGoogleTagForConsent("G-TEST123", true, false),
    true,
  );
  assert.equal(
    canLoadGoogleTagForConsent("G-TEST123", false, true),
    false,
  );
  assert.equal(
    canLoadGoogleTagForConsent("AW-123456789", false, true),
    true,
  );
  assert.equal(
    canLoadGoogleTagForConsent("AW-123456789", true, false),
    false,
  );
});
