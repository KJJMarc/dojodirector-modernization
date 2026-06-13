import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAcademyLeadConversionEventPlan,
  buildAcademyPublicPixelSettings,
  buildGoogleAdsConversionSendTo,
  isGoogleAdsTagId,
  isValidGoogleTagId,
  isValidMetaPixelId,
  resolveGoogleAdsConversionLabelForClub,
} from "@/lib/academy-pixel-settings.shared";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

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
    assert.equal(isGoogleAdsTagId("AW-123456789"), true);
    assert.equal(isGoogleAdsTagId("G-ABC123XYZ"), false);
  });
});

describe("resolveGoogleAdsConversionLabelForClub", () => {
  it("prefers the database label over the env fallback", () => {
    assert.equal(
      resolveGoogleAdsConversionLabelForClub({
        clubSlug: KINGSTON_CLUB_SLUG,
        databaseLabel: "db_label",
        envLabel: "env_label",
      }),
      "db_label",
    );
  });

  it("uses the Kingston env fallback when the database label is empty", () => {
    assert.equal(
      resolveGoogleAdsConversionLabelForClub({
        clubSlug: KINGSTON_CLUB_SLUG,
        databaseLabel: null,
        envLabel: "env_label",
      }),
      "env_label",
    );
  });

  it("does not apply the env fallback to other academies", () => {
    assert.equal(
      resolveGoogleAdsConversionLabelForClub({
        clubSlug: "bahamas-jiu-jitsu",
        databaseLabel: null,
        envLabel: "env_label",
      }),
      null,
    );
  });
});

describe("buildAcademyLeadConversionEventPlan", () => {
  it("fires GA4 generate_lead only for G- tags", () => {
    const settings = buildAcademyPublicPixelSettings({
      clubSlug: "kingston-jiu-jitsu",
      metaPixelEnabled: false,
      metaPixelId: null,
      googleTrackingEnabled: true,
      googleTagId: "G-TEST123",
      googleAdsConversionLabel: null,
    });

    assert.deepEqual(buildAcademyLeadConversionEventPlan(settings!), {
      metaLead: false,
      googleAdsConversion: false,
      googleGenerateLead: true,
      googleAdsConversionSendTo: null,
    });
  });

  it("fires conversion and generate_lead for Kingston AW-846017609", () => {
    const settings = buildAcademyPublicPixelSettings({
      clubSlug: KINGSTON_CLUB_SLUG,
      metaPixelEnabled: false,
      metaPixelId: null,
      googleTrackingEnabled: true,
      googleTagId: "AW-846017609",
      googleAdsConversionLabel: "i0ZxCIWfqb4cEMnotJMD",
    });

    assert.deepEqual(buildAcademyLeadConversionEventPlan(settings!), {
      metaLead: false,
      googleAdsConversion: true,
      googleGenerateLead: true,
      googleAdsConversionSendTo: "AW-846017609/i0ZxCIWfqb4cEMnotJMD",
    });
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
