import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyLeadAttribution,
  parseLeadAttributionFromFormData,
  sanitizeLeadAttribution,
} from "./lead-attribution.shared.ts";

describe("classifyLeadAttribution", () => {
  it("classifies gclid as Google Ads", () => {
    assert.equal(
      classifyLeadAttribution(
        sanitizeLeadAttribution({
          gclid: "abc123",
        }),
      ),
      "google_ads",
    );
  });

  it("classifies Google paid UTMs as Google Ads", () => {
    assert.equal(
      classifyLeadAttribution(
        sanitizeLeadAttribution({
          utm_source: "google",
          utm_medium: "cpc",
        }),
      ),
      "google_ads",
    );
  });

  it("classifies fbclid as Meta Ads", () => {
    assert.equal(
      classifyLeadAttribution(
        sanitizeLeadAttribution({
          fbclid: "fb123",
        }),
      ),
      "facebook_ads",
    );
  });

  it("classifies Meta paid UTMs as Meta Ads", () => {
    assert.equal(
      classifyLeadAttribution(
        sanitizeLeadAttribution({
          utm_source: "facebook",
          utm_medium: "paid",
        }),
      ),
      "facebook_ads",
    );
  });

  it("classifies organic search referrer as Organic Search", () => {
    assert.equal(
      classifyLeadAttribution(
        sanitizeLeadAttribution({
          referrer_url: "https://www.google.com/search?q=jiu+jitsu",
        }),
      ),
      "google_search",
    );
  });

  it("classifies external referrer as Referral", () => {
    assert.equal(
      classifyLeadAttribution(
        sanitizeLeadAttribution({
          referrer_url: "https://localblog.example/article",
        }),
      ),
      "referral",
    );
  });

  it("classifies empty attribution as Direct / Unknown", () => {
    assert.equal(classifyLeadAttribution(sanitizeLeadAttribution({})), "website_direct");
  });

  it("prioritises Google Ads over Meta signals", () => {
    assert.equal(
      classifyLeadAttribution(
        sanitizeLeadAttribution({
          gclid: "abc123",
          fbclid: "fb123",
        }),
      ),
      "google_ads",
    );
  });
});

describe("parseLeadAttributionFromFormData", () => {
  it("reads attribution fields from form data", () => {
    const formData = new FormData();
    formData.set("gclid", "abc123");
    formData.set("utm_source", "google");
    formData.set("utm_medium", "cpc");
    formData.set("referrer_url", "https://www.google.com/");

    assert.deepEqual(parseLeadAttributionFromFormData(formData), {
      gclid: "abc123",
      fbclid: null,
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      referrer_url: "https://www.google.com/",
    });
  });
});
