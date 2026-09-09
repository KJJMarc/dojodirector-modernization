import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPublicTimetableVenueGroups } from "./public-timetable.shared.ts";
import {
  buildPublicTimetableApiResponse,
  PUBLIC_TIMETABLE_API_CACHE_CONTROL,
} from "./public-timetable-api.shared.ts";

describe("buildPublicTimetableApiResponse", () => {
  it("maps public timetable groups to the JSON contract without private fields", () => {
    const venues = buildPublicTimetableVenueGroups([
      {
        id: "schedule-1",
        classId: "class-1",
        className: "Fundamentals",
        dayOfWeek: 1,
        startTime: "18:00",
        endTime: "19:00",
        location: "Tiffin Sports Centre",
        isActive: true,
        classIsActive: true,
        programmeType: "bjj",
      },
      {
        id: "schedule-hidden",
        classId: "class-hidden",
        className: "Archived",
        dayOfWeek: 1,
        startTime: "19:00",
        endTime: "20:00",
        location: "Tiffin Sports Centre",
        isActive: true,
        classIsActive: false,
        programmeType: "bjj",
      },
    ]);

    const payload = buildPublicTimetableApiResponse({
      club: { slug: "kingston-jiu-jitsu", name: "Kingston Jiu Jitsu" },
      venues,
    });
    const serialized = JSON.stringify(payload);

    assert.equal(payload.club.slug, "kingston-jiu-jitsu");
    assert.equal(payload.timeZone, "Europe/London");
    assert.equal(payload.venues.length, 1);
    assert.equal(payload.venues[0].name, "Tiffin Sports Centre");
    assert.equal(payload.venues[0].days[0].classes.length, 1);

    const entry = payload.venues[0].days[0].classes[0];
    assert.deepEqual(entry, {
      id: "schedule-1",
      classId: "class-1",
      name: "Fundamentals",
      day: "Monday",
      dayOfWeek: 1,
      startTime: "18:00",
      endTime: "19:00",
      venue: "Tiffin Sports Centre",
      ageGroup: null,
      programme: "BJJ",
      programmeType: "bjj",
      instructor: null,
      displayColour: null,
    });

    assert.doesNotMatch(serialized, /capacity/i);
    assert.doesNotMatch(serialized, /attendance/i);
    assert.doesNotMatch(serialized, /email/i);
    assert.equal(PUBLIC_TIMETABLE_API_CACHE_CONTROL.includes("s-maxage=300"), true);
  });

  it("labels kids programme types on the kids academy payload", () => {
    const venues = buildPublicTimetableVenueGroups([
      {
        id: "kids-1",
        classId: "kids-class-1",
        className: "Little Grapplers",
        dayOfWeek: 6,
        startTime: "10:00",
        endTime: "11:00",
        location: "Kingston Academy",
        isActive: true,
        programmeType: "muay_thai",
      },
    ]);

    const payload = buildPublicTimetableApiResponse({
      club: { slug: "kingston-jiu-jitsu-kids", name: "Kingston Jiu Jitsu Kids" },
      venues,
    });
    const entry = payload.venues[0].days[0].classes[0];

    assert.equal(payload.club.slug, "kingston-jiu-jitsu-kids");
    assert.equal(entry.name, "Little Grapplers");
    assert.equal(entry.day, "Saturday");
    assert.equal(entry.programme, "Muay Thai");
    assert.equal(entry.ageGroup, null);
    assert.equal(entry.instructor, null);
    assert.equal(entry.displayColour, null);
  });
});
