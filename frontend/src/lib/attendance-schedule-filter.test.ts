import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatAttendanceScheduleFilterHeading,
  getAttendanceScheduleFilterDateRange,
  isValidAttendanceDateKey,
  resolveAttendanceScheduleFilter,
} from "@/lib/attendance-schedule";

describe("attendance register date filter", () => {
  const from = new Date("2026-06-09T12:00:00.000Z");

  it("validates London date keys", () => {
    assert.equal(isValidAttendanceDateKey("2026-06-09"), true);
    assert.equal(isValidAttendanceDateKey("2026-13-01"), false);
    assert.equal(isValidAttendanceDateKey("09-06-2026"), false);
  });

  it("defaults to the upcoming schedule view", () => {
    assert.deepEqual(resolveAttendanceScheduleFilter(null, from), {
      mode: "default",
    });
  });

  it("resolves a single-day filter", () => {
    assert.deepEqual(
      resolveAttendanceScheduleFilter({ date: "2026-06-04" }, from),
      {
        mode: "date-filter",
        dateKey: "2026-06-04",
        rangeStartKey: "2026-06-04",
        rangeEndKey: "2026-06-04",
        days: 1,
      },
    );
  });

  it("resolves a multi-day filter ending today", () => {
    assert.deepEqual(resolveAttendanceScheduleFilter({ days: 7 }, from), {
      mode: "date-filter",
      rangeStartKey: "2026-06-03",
      rangeEndKey: "2026-06-09",
      days: 7,
    });
  });

  it("builds a single-day UTC query range", () => {
    const range = getAttendanceScheduleFilterDateRange(
      resolveAttendanceScheduleFilter({ date: "2026-06-04" }, from),
      from,
    );

    assert.equal(range.startDateKey, "2026-06-04");
    assert.equal(range.endDateKey, "2026-06-04");
    assert.ok(range.startIso < range.endIso);
  });

  it("formats a prominent heading for the selected date", () => {
    const heading = formatAttendanceScheduleFilterHeading(
      resolveAttendanceScheduleFilter({ date: "2026-06-04" }, from),
    );

    assert.match(heading ?? "", /Showing sessions for/);
    assert.match(heading ?? "", /2026/);
  });
});
