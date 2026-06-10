import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PIXEL_TRACKING_RECENT_EVENT_MS,
  buildAcademyPixelTrackingStatusSummary,
  buildGooglePixelTrackingStatus,
  buildMetaPixelTrackingStatus,
  formatPixelTrackingEventType,
  isGooglePixelTrackingEventType,
  isMetaPixelTrackingEventType,
} from "@/lib/academy-pixel-tracking.shared";

describe("pixel tracking event validation", () => {
  it("accepts known Meta and Google event types", () => {
    assert.equal(isMetaPixelTrackingEventType("PageView"), true);
    assert.equal(isMetaPixelTrackingEventType("Lead"), true);
    assert.equal(isMetaPixelTrackingEventType("Purchase"), false);
    assert.equal(isGooglePixelTrackingEventType("page_view"), true);
    assert.equal(isGooglePixelTrackingEventType("generate_lead"), true);
    assert.equal(isGooglePixelTrackingEventType("PageView"), false);
  });
});

describe("pixel tracking status resolution", () => {
  const nowMs = Date.parse("2026-06-09T12:00:00.000Z");

  it("marks unconfigured providers as not configured", () => {
    assert.equal(
      buildMetaPixelTrackingStatus({
        enabled: false,
        pixelId: null,
        lastEventType: null,
        lastEventAt: null,
        nowMs,
      }).health,
      "not_configured",
    );
  });

  it("marks configured providers without events as installed but idle", () => {
    assert.equal(
      buildGooglePixelTrackingStatus({
        enabled: true,
        googleTagId: "G-TEST123",
        lastEventType: null,
        lastEventAt: null,
        nowMs,
      }).health,
      "installed_no_recent",
    );
  });

  it("marks recent events as active", () => {
    const recentAt = new Date(
      nowMs - PIXEL_TRACKING_RECENT_EVENT_MS + 60_000,
    ).toISOString();

    assert.equal(
      buildMetaPixelTrackingStatus({
        enabled: true,
        pixelId: "123456789012345",
        lastEventType: "PageView",
        lastEventAt: recentAt,
        nowMs,
      }).health,
      "active",
    );
  });

  it("returns unknown when status storage is unavailable", () => {
    const summary = buildAcademyPixelTrackingStatusSummary({
      metaPixelEnabled: true,
      metaPixelId: "123456789012345",
      metaPixelLastEventType: "PageView",
      metaPixelLastEventAt: "2026-06-09T11:00:00.000Z",
      googleTrackingEnabled: true,
      googleTagId: "G-TEST123",
      googleLastEventType: "page_view",
      googleLastEventAt: "2026-06-09T11:00:00.000Z",
      statusAvailable: false,
      nowMs,
    });

    assert.equal(summary.statusAvailable, false);
    assert.equal(summary.meta.health, "unknown");
    assert.equal(summary.google.health, "unknown");
  });
});

describe("formatPixelTrackingEventType", () => {
  it("formats Google event names for display", () => {
    assert.equal(formatPixelTrackingEventType("page_view"), "Page view");
    assert.equal(formatPixelTrackingEventType("generate_lead"), "Lead");
    assert.equal(formatPixelTrackingEventType("PageView"), "PageView");
  });
});
