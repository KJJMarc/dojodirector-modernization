import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAdminRecurringSessionExternalId,
  computeSyncedRecurringSessionFields,
  planRecurringSessionSyncTargets,
  shiftLondonDateKeyToDayOfWeek,
} from "./admin-recurring-session-sync.shared.ts";
import {
  londonLocalDateTimeToUtcIso,
  utcIsoToLondonDayOfWeek,
  utcIsoToLondonTime,
} from "./london-datetime.ts";

const SCHEDULE_ID = "11111111-1111-1111-1111-111111111111";
const LOCATION = "Old Fort Bay Shopping Centre, Building B, Unit 8";

function sessionAt(input: {
  id: string;
  dateKey: string;
  startTime: string;
  endTime: string;
}) {
  const externalId = buildAdminRecurringSessionExternalId({
    scheduleId: SCHEDULE_ID,
    dateKey: input.dateKey,
    startTime: input.startTime,
    location: LOCATION,
  });

  return {
    id: input.id,
    startsAt: londonLocalDateTimeToUtcIso(input.dateKey, input.startTime),
    endsAt: londonLocalDateTimeToUtcIso(input.dateKey, input.endTime),
    externalId,
  };
}

describe("shiftLondonDateKeyToDayOfWeek", () => {
  it("moves Monday to Wednesday in the same week", () => {
    assert.equal(shiftLondonDateKeyToDayOfWeek("2026-09-14", 3), "2026-09-16");
  });

  it("moves Wednesday forward to the following Monday", () => {
    assert.equal(shiftLondonDateKeyToDayOfWeek("2026-09-16", 1), "2026-09-21");
  });

  it("keeps the date when already on the target weekday", () => {
    assert.equal(shiftLondonDateKeyToDayOfWeek("2026-09-14", 1), "2026-09-14");
  });
});

describe("computeSyncedRecurringSessionFields", () => {
  const monday1815 = sessionAt({
    id: "session-1",
    dateKey: "2026-09-14",
    startTime: "18:15",
    endTime: "19:30",
  });

  it("updates start time only", () => {
    const synced = computeSyncedRecurringSessionFields(monday1815, {
      scheduleId: SCHEDULE_ID,
      dayOfWeek: 1,
      startTime: "18:00",
      endTime: "19:30",
      location: LOCATION,
    });

    assert.equal(synced.dateKey, "2026-09-14");
    assert.equal(synced.startTime, "18:00");
    assert.equal(synced.endTime, "19:30");
    assert.equal(utcIsoToLondonTime(synced.startsAt), "18:00");
    assert.equal(utcIsoToLondonTime(synced.endsAt), "19:30");
    assert.equal(utcIsoToLondonDayOfWeek(synced.startsAt), 1);
    assert.match(synced.externalId, /:2026-09-14:18:00:/);
    assert.equal(
      synced.startsAt,
      londonLocalDateTimeToUtcIso("2026-09-14", "18:00"),
    );
    assert.equal(
      synced.endsAt,
      londonLocalDateTimeToUtcIso("2026-09-14", "19:30"),
    );
  });

  it("updates end time only", () => {
    const synced = computeSyncedRecurringSessionFields(monday1815, {
      scheduleId: SCHEDULE_ID,
      dayOfWeek: 1,
      startTime: "18:15",
      endTime: "20:00",
      location: LOCATION,
    });

    assert.equal(utcIsoToLondonTime(synced.startsAt), "18:15");
    assert.equal(utcIsoToLondonTime(synced.endsAt), "20:00");
    assert.match(synced.externalId, /:2026-09-14:18:15:/);
  });

  it("updates start and end together", () => {
    const synced = computeSyncedRecurringSessionFields(monday1815, {
      scheduleId: SCHEDULE_ID,
      dayOfWeek: 1,
      startTime: "18:00",
      endTime: "19:45",
      location: LOCATION,
    });

    assert.equal(utcIsoToLondonTime(synced.startsAt), "18:00");
    assert.equal(utcIsoToLondonTime(synced.endsAt), "19:45");
    assert.equal(
      synced.externalId,
      buildAdminRecurringSessionExternalId({
        scheduleId: SCHEDULE_ID,
        dateKey: "2026-09-14",
        startTime: "18:00",
        location: LOCATION,
      }),
    );
  });

  it("moves weekday while preserving recurrence order and wall-clock time", () => {
    const synced = computeSyncedRecurringSessionFields(monday1815, {
      scheduleId: SCHEDULE_ID,
      dayOfWeek: 2,
      startTime: "18:15",
      endTime: "19:30",
      location: LOCATION,
    });

    assert.equal(synced.dateKey, "2026-09-15");
    assert.equal(utcIsoToLondonDayOfWeek(synced.startsAt), 2);
    assert.equal(utcIsoToLondonTime(synced.startsAt), "18:15");
    assert.equal(utcIsoToLondonTime(synced.endsAt), "19:30");
    assert.match(synced.externalId, /:2026-09-15:18:15:/);
  });

  it("keeps starts_at, ends_at and external_id mutually consistent", () => {
    const synced = computeSyncedRecurringSessionFields(monday1815, {
      scheduleId: SCHEDULE_ID,
      dayOfWeek: 3,
      startTime: "18:00",
      endTime: "19:30",
      location: LOCATION,
    });

    assert.equal(
      synced.startsAt,
      londonLocalDateTimeToUtcIso(synced.dateKey, synced.startTime),
    );
    assert.equal(
      synced.endsAt,
      londonLocalDateTimeToUtcIso(synced.dateKey, synced.endTime),
    );
    assert.equal(
      synced.externalId,
      buildAdminRecurringSessionExternalId({
        scheduleId: SCHEDULE_ID,
        dateKey: synced.dateKey,
        startTime: synced.startTime,
        location: LOCATION,
      }),
    );
  });
});

describe("planRecurringSessionSyncTargets", () => {
  const schedule = {
    scheduleId: SCHEDULE_ID,
    dayOfWeek: 1,
    startTime: "18:00",
    endTime: "19:30",
    location: LOCATION,
  };

  it("preserves session ids so bookings/waitlists stay attached after a time change", () => {
    const sessions = [
      sessionAt({
        id: "booked-session",
        dateKey: "2026-09-14",
        startTime: "18:15",
        endTime: "19:30",
      }),
      sessionAt({
        id: "waitlisted-session",
        dateKey: "2026-09-21",
        startTime: "18:15",
        endTime: "19:30",
      }),
    ];

    const { targets, skippedCollisionIds } = planRecurringSessionSyncTargets({
      sessions,
      schedule,
      occupiedStartsAtKeys: new Set(),
    });

    assert.deepEqual(
      targets.map((target) => target.id),
      ["booked-session", "waitlisted-session"],
    );
    assert.equal(skippedCollisionIds.length, 0);
    assert.equal(targets[0]?.timingChanged, true);
    assert.equal(utcIsoToLondonTime(targets[0]!.startsAt), "18:00");
  });

  it("does not create duplicate targets for the same sessions", () => {
    const sessions = [
      sessionAt({
        id: "session-a",
        dateKey: "2026-09-14",
        startTime: "18:15",
        endTime: "19:30",
      }),
    ];

    const { targets } = planRecurringSessionSyncTargets({
      sessions,
      schedule,
      occupiedStartsAtKeys: new Set(),
    });

    assert.equal(targets.length, 1);
    assert.equal(targets[0]?.id, "session-a");
  });

  it("skips colliding into another legitimate session slot", () => {
    const sessions = [
      sessionAt({
        id: "moving-session",
        dateKey: "2026-09-14",
        startTime: "18:15",
        endTime: "19:30",
      }),
    ];
    const occupied = londonLocalDateTimeToUtcIso("2026-09-14", "18:00");

    const { targets, skippedCollisionIds } = planRecurringSessionSyncTargets({
      sessions,
      schedule,
      occupiedStartsAtKeys: new Set([new Date(occupied).toISOString()]),
    });

    assert.deepEqual(targets, []);
    assert.deepEqual(skippedCollisionIds, ["moving-session"]);
  });

  it("skips sibling collisions when two sessions map to the same target slot", () => {
    const sessions = [
      sessionAt({
        id: "first",
        dateKey: "2026-09-14",
        startTime: "18:15",
        endTime: "19:30",
      }),
      {
        id: "second",
        startsAt: londonLocalDateTimeToUtcIso("2026-09-14", "17:45"),
        endsAt: londonLocalDateTimeToUtcIso("2026-09-14", "19:00"),
        externalId: buildAdminRecurringSessionExternalId({
          scheduleId: SCHEDULE_ID,
          dateKey: "2026-09-14",
          startTime: "17:45",
          location: LOCATION,
        }),
      },
    ];

    const { targets, skippedCollisionIds } = planRecurringSessionSyncTargets({
      sessions,
      schedule,
      occupiedStartsAtKeys: new Set(),
    });

    assert.equal(targets.length, 1);
    assert.equal(targets[0]?.id, "first");
    assert.deepEqual(skippedCollisionIds, ["second"]);
  });

  it("leaves historical sessions out by only planning the provided future rows", () => {
    const futureOnly = [
      sessionAt({
        id: "future",
        dateKey: "2026-09-14",
        startTime: "18:15",
        endTime: "19:30",
      }),
    ];

    const { targets } = planRecurringSessionSyncTargets({
      sessions: futureOnly,
      schedule,
      occupiedStartsAtKeys: new Set(),
    });

    assert.deepEqual(
      targets.map((target) => target.id),
      ["future"],
    );
  });

  it("documents that attendance-protected sessions are excluded before planning", () => {
    const updatable = [
      sessionAt({
        id: "no-attendance",
        dateKey: "2026-09-14",
        startTime: "18:15",
        endTime: "19:30",
      }),
    ];
    const attendanceProtectedIds = new Set(["with-attendance"]);

    const sessionsForSync = updatable.filter(
      (session) => !attendanceProtectedIds.has(session.id),
    );

    const { targets } = planRecurringSessionSyncTargets({
      sessions: sessionsForSync,
      schedule,
      occupiedStartsAtKeys: new Set(),
    });

    assert.equal(
      targets.some((target) => target.id === "with-attendance"),
      false,
    );
    assert.equal(targets[0]?.id, "no-attendance");
  });
});
