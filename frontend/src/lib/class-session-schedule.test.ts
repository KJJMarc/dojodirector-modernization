import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatScheduleTimeRange,
  formatScheduleDayLabelSafe,
  resolveEffectiveRecurringScheduleId,
  resolveScheduleDateKey,
} from "./class-session-schedule.ts";
import { utcIsoToLondonTime } from "./london-datetime.ts";

describe("formatScheduleTimeRange", () => {
  const thursdayMuayThai = {
    startsAt: "2026-06-04T19:00:00+00:00",
    endsAt: "2026-06-04T20:00:00+00:00",
    externalId:
      "kjj_timetable:416e06cd-0fb9-4051-96f6-751d364ebca6:2026-06-04:18:00:Tiffin_Sport",
  };

  it("uses timetable slot time from external_id when present", () => {
    assert.equal(
      formatScheduleTimeRange(
        thursdayMuayThai.startsAt,
        thursdayMuayThai.endsAt,
        thursdayMuayThai.externalId,
      ),
      "18:00 – 19:00",
    );
  });

  it("falls back to London wall time from starts_at when external_id is absent", () => {
    assert.equal(
      formatScheduleTimeRange(thursdayMuayThai.startsAt, thursdayMuayThai.endsAt),
      `${utcIsoToLondonTime(thursdayMuayThai.startsAt)} – ${utcIsoToLondonTime(thursdayMuayThai.endsAt)}`,
    );
  });

  it("documents attendance bug when external_id is omitted on timetable rows", () => {
    assert.equal(
      formatScheduleTimeRange(thursdayMuayThai.startsAt, thursdayMuayThai.endsAt),
      "20:00 – 21:00",
    );
    assert.equal(
      formatScheduleTimeRange(
        thursdayMuayThai.startsAt,
        thursdayMuayThai.endsAt,
        thursdayMuayThai.externalId,
      ),
      "18:00 – 19:00",
    );
  });
});

describe("resolveScheduleDateKey", () => {
  it("uses timetable date from external_id", () => {
    assert.equal(
      resolveScheduleDateKey({
        startsAt: "2026-06-04T19:00:00+00:00",
        externalId:
          "kjj_timetable:class:2026-06-04:18:00:Tiffin_Sport",
      }),
      "2026-06-04",
    );
  });
});

describe("resolveEffectiveRecurringScheduleId", () => {
  const tiffinSchedule = {
    id: "schedule-tiffin",
    class_id: "class-muay-thai",
    day_of_week: 4,
    start_time: "18:00",
    location: "Tiffin Sport",
    is_active: true,
  };

  const parishSchedule = {
    id: "schedule-parish",
    class_id: "class-muay-thai",
    day_of_week: 4,
    start_time: "18:00",
    location: "St. John's Parish Hall",
    is_active: true,
  };

  const thursdaySession = {
    class_id: "class-muay-thai",
    starts_at: "2026-06-04T19:00:00+00:00",
    external_id:
      "kjj_timetable:class-muay-thai:2026-06-04:18:00:Tiffin_Sport",
    recurring_schedule_id: null as string | null,
    source: "kjj_timetable_seed",
  };

  it("matches an unlinked session to its recurring schedule by slot", () => {
    assert.equal(
      resolveEffectiveRecurringScheduleId(thursdaySession, [tiffinSchedule]),
      "schedule-tiffin",
    );
  });

  it("prefers location when multiple schedules share day and time", () => {
    assert.equal(
      resolveEffectiveRecurringScheduleId(thursdaySession, [
        parishSchedule,
        tiffinSchedule,
      ]),
      "schedule-tiffin",
    );
  });

  it("returns the explicit recurring_schedule_id when set", () => {
    assert.equal(
      resolveEffectiveRecurringScheduleId(
        { ...thursdaySession, recurring_schedule_id: "schedule-parish" },
        [tiffinSchedule, parishSchedule],
      ),
      "schedule-parish",
    );
  });

  it("skips inactive schedules when activeOnly is true", () => {
    assert.equal(
      resolveEffectiveRecurringScheduleId(
        thursdaySession,
        [{ ...tiffinSchedule, is_active: false }],
        { activeOnly: true },
      ),
      null,
    );
    assert.equal(
      resolveEffectiveRecurringScheduleId(
        thursdaySession,
        [{ ...tiffinSchedule, is_active: false }],
        { activeOnly: false },
      ),
      "schedule-tiffin",
    );
  });
});

describe("formatScheduleDayLabelSafe", () => {
  it("returns null for invalid timestamps instead of throwing", () => {
    assert.equal(formatScheduleDayLabelSafe("not-a-date"), null);
    assert.equal(formatScheduleDayLabelSafe(""), null);
  });

  it("formats valid timestamps", () => {
    assert.equal(
      formatScheduleDayLabelSafe("2026-06-04T19:00:00+00:00"),
      "Thursday",
    );
  });
});
