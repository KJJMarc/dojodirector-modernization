import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendLeadNote,
  buildGuestBookingLeadNote,
  normalizeLeadMatchEmail,
  normalizeLeadMatchPhone,
} from "./lead-guest-booking-match.shared.ts";

describe("normalizeLeadMatchEmail", () => {
  it("lowercases and trims", () => {
    assert.equal(normalizeLeadMatchEmail("  Test@Example.com "), "test@example.com");
  });
});

describe("normalizeLeadMatchPhone", () => {
  it("strips non-digits for exact match", () => {
    assert.equal(normalizeLeadMatchPhone("07700 900 123"), "07700900123");
    assert.equal(normalizeLeadMatchPhone("abc"), null);
  });
});

describe("appendLeadNote", () => {
  it("appends timeline entry to existing notes", () => {
    assert.equal(
      appendLeadNote("Existing note", "[1 Jan] Guest booked a trial class"),
      "Existing note\n\n[1 Jan] Guest booked a trial class",
    );
  });
});

describe("buildGuestBookingLeadNote", () => {
  it("includes class and schedule labels", () => {
    const note = buildGuestBookingLeadNote({
      className: "Kids Jiu Jitsu",
      dateLabel: "Monday 3 June",
      timeLabel: "17:00",
      bookedAtIso: "2026-06-03T16:00:00.000Z",
    });

    assert.match(note, /Guest booked a trial class: Kids Jiu Jitsu/);
    assert.match(note, /Monday 3 June, 17:00/);
  });
});
