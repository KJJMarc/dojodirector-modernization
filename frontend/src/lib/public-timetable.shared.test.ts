import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPublicTimetableVenueGroups,
  formatPublicTimetableTimeRange,
  formatPublicTimetableUkTime,
  getPublicTimetableDayLabelsMondayFirst,
  PUBLIC_TIMETABLE_EMPTY_MESSAGE,
  PUBLIC_TIMETABLE_UNASSIGNED_VENUE_LABEL,
  type PublicTimetableScheduleInput,
} from "./public-timetable.shared.ts";
import { clubTimetablePath } from "./clubs.shared.ts";
import { getAcademyPublicPagesForClub } from "./admin-academy-pages.shared.ts";

function schedule(
  overrides: Partial<PublicTimetableScheduleInput> &
    Pick<PublicTimetableScheduleInput, "id" | "className" | "dayOfWeek" | "startTime">,
): PublicTimetableScheduleInput {
  return {
    endTime: "19:00",
    location: "Main Dojo",
    isActive: true,
    classIsActive: true,
    ...overrides,
  };
}

describe("formatPublicTimetableUkTime", () => {
  it("formats UK 12-hour times", () => {
    assert.equal(formatPublicTimetableUkTime("18:00"), "6:00 pm");
    assert.equal(formatPublicTimetableUkTime("09:30"), "9:30 am");
    assert.equal(formatPublicTimetableUkTime("12:00"), "12:00 pm");
    assert.equal(formatPublicTimetableUkTime("00:15"), "12:15 am");
  });

  it("formats ranges with en-dash", () => {
    assert.equal(formatPublicTimetableTimeRange("18:00", "19:00"), "6:00 pm–7:00 pm");
  });

  it("shows start only when end is missing", () => {
    assert.equal(formatPublicTimetableTimeRange("16:30", null), "4:30 pm");
  });

  it("still formats overnight-looking pairs without crashing", () => {
    assert.equal(
      formatPublicTimetableTimeRange("22:00", "01:00"),
      "10:00 pm–1:00 am",
    );
  });
});

describe("buildPublicTimetableVenueGroups", () => {
  it("orders weekdays Monday through Sunday", () => {
    const groups = buildPublicTimetableVenueGroups([
      schedule({ id: "sun", className: "Open Mat", dayOfWeek: 0, startTime: "10:00" }),
      schedule({ id: "mon", className: "Fundamentals", dayOfWeek: 1, startTime: "18:00" }),
      schedule({ id: "sat", className: "Kids", dayOfWeek: 6, startTime: "11:00" }),
    ]);

    assert.equal(groups.length, 1);
    assert.deepEqual(
      groups[0].days.map((day) => day.dayLabel),
      ["Monday", "Saturday", "Sunday"],
    );
  });

  it("sorts classes by start time within each day", () => {
    const groups = buildPublicTimetableVenueGroups([
      schedule({
        id: "b",
        className: "Evening",
        dayOfWeek: 1,
        startTime: "19:00",
        endTime: "20:00",
      }),
      schedule({
        id: "a",
        className: "Afternoon",
        dayOfWeek: 1,
        startTime: "16:30",
        endTime: "17:30",
      }),
    ]);

    assert.deepEqual(
      groups[0].days[0].classes.map((entry) => entry.className),
      ["Afternoon", "Evening"],
    );
  });

  it("groups venues and put unassigned last", () => {
    const groups = buildPublicTimetableVenueGroups([
      schedule({
        id: "unassigned",
        className: "TBD Class",
        dayOfWeek: 2,
        startTime: "12:00",
        location: "  ",
      }),
      schedule({
        id: "tiffin",
        className: "Adult Gi",
        dayOfWeek: 1,
        startTime: "18:00",
        location: "Tiffin Sports Centre",
      }),
      schedule({
        id: "stjohns",
        className: "Kids",
        dayOfWeek: 3,
        startTime: "16:30",
        location: "St. John's Parish Hall",
      }),
    ]);

    assert.equal(groups.length, 3);
    assert.equal(groups[0].venueName, "St. John's Parish Hall");
    assert.equal(groups[1].venueName, "Tiffin Sports Centre");
    assert.equal(groups[2].venueName, PUBLIC_TIMETABLE_UNASSIGNED_VENUE_LABEL);
  });

  it("excludes inactive schedules and inactive class templates", () => {
    const groups = buildPublicTimetableVenueGroups([
      schedule({
        id: "active",
        className: "Fundamentals",
        dayOfWeek: 1,
        startTime: "18:00",
      }),
      schedule({
        id: "inactive-schedule",
        className: "Old Class",
        dayOfWeek: 1,
        startTime: "19:00",
        isActive: false,
      }),
      schedule({
        id: "inactive-class",
        className: "Archived",
        dayOfWeek: 2,
        startTime: "18:00",
        classIsActive: false,
      }),
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].days.length, 1);
    assert.equal(groups[0].days[0].classes.length, 1);
    assert.equal(groups[0].days[0].classes[0].className, "Fundamentals");
  });

  it("returns empty groups for empty schedule list", () => {
    assert.deepEqual(buildPublicTimetableVenueGroups([]), []);
    assert.ok(PUBLIC_TIMETABLE_EMPTY_MESSAGE.includes("updated"));
  });

  it("keeps simultaneous classes at the same venue/day", () => {
    const groups = buildPublicTimetableVenueGroups([
      schedule({
        id: "gi",
        className: "Adult Gi",
        dayOfWeek: 3,
        startTime: "18:15",
        endTime: "19:30",
      }),
      schedule({
        id: "nogi",
        className: "Adult No Gi",
        dayOfWeek: 3,
        startTime: "18:15",
        endTime: "19:30",
      }),
    ]);

    assert.equal(groups[0].days[0].classes.length, 2);
  });

  it("skips malformed day of week without crashing", () => {
    const groups = buildPublicTimetableVenueGroups([
      schedule({
        id: "bad",
        className: "Broken",
        dayOfWeek: 9,
        startTime: "10:00",
      }),
      schedule({
        id: "ok",
        className: "Valid",
        dayOfWeek: 1,
        startTime: "10:00",
      }),
    ]);

    assert.equal(groups[0].days[0].classes[0].className, "Valid");
  });
});

describe("clubTimetablePath and Academy Pages catalog", () => {
  it("builds academy-scoped public timetable URLs", () => {
    assert.equal(clubTimetablePath("kingston-jiu-jitsu"), "/kingston-jiu-jitsu/timetable");
    assert.equal(clubTimetablePath("bahamas-jiu-jitsu"), "/bahamas-jiu-jitsu/timetable");
  });

  it("includes Timetable in Academy Pages for every academy", () => {
    const kingston = getAcademyPublicPagesForClub("kingston-jiu-jitsu");
    const bahamas = getAcademyPublicPagesForClub("bahamas-jiu-jitsu");
    const kids = getAcademyPublicPagesForClub("kingston-jiu-jitsu-kids");

    const findTimetable = (pages: ReturnType<typeof getAcademyPublicPagesForClub>) =>
      pages.find((page) => page.id === "timetable");

    assert.equal(findTimetable(kingston)?.href, "/kingston-jiu-jitsu/timetable");
    assert.equal(findTimetable(bahamas)?.href, "/bahamas-jiu-jitsu/timetable");
    assert.equal(findTimetable(kids)?.href, "/kingston-jiu-jitsu-kids/timetable");
    assert.match(
      findTimetable(kingston)?.description ?? "",
      /active recurring classes/i,
    );
  });

  it("does not blend Monday-Sunday labels across academies", () => {
    assert.deepEqual(getPublicTimetableDayLabelsMondayFirst(), [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });
});
