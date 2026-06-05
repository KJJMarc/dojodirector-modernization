import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addLondonCalendarDays,
  getLondonDateRangeIso,
  getLondonTodayDateKey,
  londonLocalDateTimeToUtcIso,
  utcIsoToLondonDate,
  utcIsoToLondonTime,
} from "./london-datetime.ts";

describe("londonLocalDateTimeToUtcIso — winter Wednesday 19:00", () => {
  it("stores 19:00 UTC when UK is on GMT", () => {
    const iso = londonLocalDateTimeToUtcIso("2026-01-07", "19:00");

    assert.equal(iso, "2026-01-07T19:00:00.000Z");
    assert.equal(utcIsoToLondonTime(iso), "19:00");
    assert.equal(utcIsoToLondonDate(iso), "2026-01-07");
  });
});

describe("londonLocalDateTimeToUtcIso — summer Wednesday 19:00", () => {
  it("stores 18:00 UTC when UK is on BST", () => {
    const iso = londonLocalDateTimeToUtcIso("2026-07-01", "19:00");

    assert.equal(iso, "2026-07-01T18:00:00.000Z");
    assert.equal(utcIsoToLondonTime(iso), "19:00");
    assert.equal(utcIsoToLondonDate(iso), "2026-07-01");
  });
});

describe("londonLocalDateTimeToUtcIso — BST transition week (spring forward)", () => {
  it("keeps 19:00 wall clock on the Wednesday before clocks change", () => {
    const before = londonLocalDateTimeToUtcIso("2026-03-25", "19:00");
    assert.equal(utcIsoToLondonTime(before), "19:00");
    assert.equal(before, "2026-03-25T19:00:00.000Z");
  });

  it("keeps 19:00 wall clock on the Wednesday after clocks change", () => {
    const after = londonLocalDateTimeToUtcIso("2026-04-01", "19:00");
    assert.equal(utcIsoToLondonTime(after), "19:00");
    assert.equal(after, "2026-04-01T18:00:00.000Z");
  });
});

describe("londonLocalDateTimeToUtcIso — GMT transition week (fall back)", () => {
  it("keeps 19:00 wall clock on the Wednesday before clocks change", () => {
    const before = londonLocalDateTimeToUtcIso("2026-10-21", "19:00");
    assert.equal(utcIsoToLondonTime(before), "19:00");
    assert.equal(before, "2026-10-21T18:00:00.000Z");
  });

  it("keeps 19:00 wall clock on the Wednesday after clocks change", () => {
    const after = londonLocalDateTimeToUtcIso("2026-10-28", "19:00");
    assert.equal(utcIsoToLondonTime(after), "19:00");
    assert.equal(after, "2026-10-28T19:00:00.000Z");
  });
});

describe("getLondonDateRangeIso", () => {
  it("anchors range to Europe/London midnight, not UTC midnight", () => {
    const from = new Date("2026-07-01T22:30:00.000Z");
    const { startIso, endIso, startDateKey } = getLondonDateRangeIso({
      daysAhead: 1,
      from,
    });

    assert.equal(startDateKey, "2026-07-01");
    assert.equal(startIso, londonLocalDateTimeToUtcIso("2026-07-01", "00:00"));
    assert.equal(endIso, londonLocalDateTimeToUtcIso("2026-07-02", "00:00"));
  });
});

describe("getLondonTodayDateKey", () => {
  it("uses London calendar date when UTC date differs (BST evening)", () => {
    const from = new Date("2026-07-01T22:30:00.000Z");
    assert.equal(getLondonTodayDateKey(from), "2026-07-01");
  });
});

describe("addLondonCalendarDays", () => {
  it("adds calendar days across a month boundary", () => {
    assert.equal(addLondonCalendarDays("2026-01-28", 7), "2026-02-04");
  });
});
