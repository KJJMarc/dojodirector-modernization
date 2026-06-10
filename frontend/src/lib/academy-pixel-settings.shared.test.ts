import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAcademyPublicPixelSettings,
  buildGoogleAdsConversionSendTo,
  isValidGoogleTagId,
  isValidMetaPixelId,
} from "@/lib/academy-pixel-settings.shared";

describe("academy pixel ID validation", () => {
  it("accepts numeric Meta Pixel IDs", () => {
    assert.equal(isValidMetaPixelId("123456789012345"), true);
    assert.equal(isValidMetaPixelId("abc"), false);
  });

  it("accepts Google tag and GA4 measurement IDs", () => {
    assert.equal(isValidGoogleTagId("G-ABC123XYZ"), true);
    assert.equal(isValidGoogleTagId("AW-123456789"), true);
    assert.equal(isValidGoogleTagId("GT-ABCDEF"), true);
    assert.equal(isValidGoogleTagId("UA-123456-1"), false);
  });
});

describe("buildGoogleAdsConversionSendTo", () => {
  it("combines AW tag IDs with conversion labels", () => {
    assert.equal(
      buildGoogleAdsConversionSendTo("AW-123456789", "trial_lead_label"),
      "AW-123456789/trial_lead_label",
    );
  });

  it("passes through full send_to values", () => {
    assert.equal(
      buildGoogleAdsConversionSendTo("G-ABCDEF", "AW-123456789/trial_lead_label"),
      "AW-123456789/trial_lead_label",
    );
  });
});

describe("buildAcademyPublicPixelSettings", () => {
  it("returns null when tracking is disabled or IDs are invalid", () => {
    assert.equal(
      buildAcademyPublicPixelSettings({
        clubSlug: "kingston-jiu-jitsu",
        metaPixelEnabled: false,
        metaPixelId: null,
        googleTrackingEnabled: false,
        googleTagId: null,
        googleAdsConversionLabel: null,
      }),
      null,
    );
  });

  it("exposes enabled tracking IDs for public pages", () => {
    assert.deepEqual(
      buildAcademyPublicPixelSettings({
        clubSlug: "kingston-jiu-jitsu",
        metaPixelEnabled: true,
        metaPixelId: "123456789012345",
        googleTrackingEnabled: true,
        googleTagId: "G-TEST123",
        googleAdsConversionLabel: null,
      }),
      {
        clubSlug: "kingston-jiu-jitsu",
        metaPixelEnabled: true,
        metaPixelId: "123456789012345",
        googleTrackingEnabled: true,
        googleTagId: "G-TEST123",
        googleAdsConversionSendTo: null,
      },
    );
  });
});
