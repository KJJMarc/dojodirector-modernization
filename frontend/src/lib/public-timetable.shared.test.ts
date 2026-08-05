import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  academyLocalCivilDateTimeToUtcIso,
  buildPublicTimetableVenueGroups,
  formatPublicTimetableLocalClockTime,
  formatPublicTimetableTimeRange,
  formatPublicTimetableUkTime,
  formatUtcInstantAsLocalClock,
  getPublicTimetableDayLabelsMondayFirst,
  PUBLIC_TIMETABLE_EMPTY_MESSAGE,
  PUBLIC_TIMETABLE_UNASSIGNED_VENUE_LABEL,
  type PublicTimetableScheduleInput,
} from "./public-timetable.shared.ts";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  BAHAMAS_JIU_JITSU_IANA_TIME_ZONE,
  clubTimetablePath,
  DEFAULT_CLUB_IANA_TIME_ZONE,
  getClubIanaTimeZone,
  KINGSTON_CLUB_SLUG,
} from "./clubs.shared.ts";
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

describe("formatPublicTimetableLocalClockTime", () => {
  it("formats academy-local 12-hour wall clocks", () => {
    assert.equal(formatPublicTimetableLocalClockTime("18:00"), "6:00 pm");
    assert.equal(formatPublicTimetableLocalClockTime("09:30"), "9:30 am");
    assert.equal(formatPublicTimetableLocalClockTime("12:00"), "12:00 pm");
    assert.equal(formatPublicTimetableLocalClockTime("00:15"), "12:15 am");
    assert.equal(formatPublicTimetableUkTime("16:30"), "4:30 pm");
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

describe("academy-local wall clocks (no visitor timezone conversion)", () => {
  const bahamasMondayAfternoon = schedule({
    id: "bahamas-young",
    className: "Young Grapplers",
    dayOfWeek: 1,
    startTime: "16:30:00",
    endTime: "17:30:00",
    location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
  });

  it("displays Bahamas 4:30 pm as 4:30 pm (source wall clock, not UK conversion)", () => {
    const groups = buildPublicTimetableVenueGroups([bahamasMondayAfternoon]);
    const entry = groups[0].days[0].classes[0];

    assert.equal(entry.dayOfWeek, 1);
    assert.equal(entry.dayLabel, "Monday");
    assert.equal(entry.startTime, "16:30");
    assert.equal(entry.timeRangeLabel, "4:30 pm–5:30 pm");
  });

  it("keeps the same display when process TZ is Europe/London (UK visitor / server)", () => {
    const previous = process.env.TZ;
    process.env.TZ = "Europe/London";

    try {
      const groups = buildPublicTimetableVenueGroups([bahamasMondayAfternoon]);
      const entry = groups[0].days[0].classes[0];
      assert.equal(entry.timeRangeLabel, "4:30 pm–5:30 pm");
      assert.equal(entry.dayOfWeek, 1);
      assert.equal(entry.dayLabel, "Monday");
    } finally {
      if (previous === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previous;
      }
    }
  });

  it("keeps identical times across visitor process timezones", () => {
    const visitorZones = [
      "Europe/London",
      "America/Nassau",
      "America/New_York",
      "Pacific/Auckland",
      "UTC",
    ];
    const previous = process.env.TZ;
    const snapshots: string[] = [];

    try {
      for (const zone of visitorZones) {
        process.env.TZ = zone;
        const groups = buildPublicTimetableVenueGroups([bahamasMondayAfternoon]);
        const entry = groups[0].days[0].classes[0];
        snapshots.push(
          `${entry.dayOfWeek}|${entry.dayLabel}|${entry.startTime}|${entry.timeRangeLabel}`,
        );
      }
    } finally {
      if (previous === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previous;
      }
    }

    assert.equal(new Set(snapshots).size, 1);
    assert.equal(snapshots[0], "1|Monday|16:30|4:30 pm–5:30 pm");
  });

  it("does not use Date-based conversion that would shift Bahamas clocks for a UK viewer", () => {
    // Bahamas wall 16:30 on a fixed Nassau calendar date → UTC, then re-read in London.
    // That conversion path yields a different clock — our timetable must not do this.
    const utcIso = academyLocalCivilDateTimeToUtcIso(
      "2026-03-09",
      "16:30",
      BAHAMAS_JIU_JITSU_IANA_TIME_ZONE,
    );
    const londonClock = formatUtcInstantAsLocalClock(utcIso, "Europe/London");

    assert.notEqual(londonClock, "16:30");
    assert.equal(formatPublicTimetableLocalClockTime("16:30"), "4:30 pm");
    assert.equal(formatPublicTimetableTimeRange("16:30", "17:30"), "4:30 pm–5:30 pm");
  });

  it("uses America/Nassau IANA rules rather than a fixed UTC-5 offset for absolute conversion", () => {
    // Display remains wall-clock; absolute conversion for session math still goes through IANA.
    assert.equal(getClubIanaTimeZone(BAHAMAS_JIU_JITSU_CLUB_SLUG), "America/Nassau");

    const winterUtc = academyLocalCivilDateTimeToUtcIso(
      "2026-01-12",
      "16:30",
      BAHAMAS_JIU_JITSU_IANA_TIME_ZONE,
    );
    const summerUtc = academyLocalCivilDateTimeToUtcIso(
      "2026-07-13",
      "16:30",
      BAHAMAS_JIU_JITSU_IANA_TIME_ZONE,
    );

    // IANA America/Nassau (not a fixed -05:00): January wall 16:30 → 21:30 UTC (EST),
    // July wall 16:30 → 20:30 UTC (EDT) according to the system tz database.
    assert.equal(formatUtcInstantAsLocalClock(winterUtc, "UTC"), "21:30");
    assert.equal(formatUtcInstantAsLocalClock(summerUtc, "UTC"), "20:30");
    assert.notEqual(winterUtc, summerUtc);

    // A fixed UTC−5 mapping would make both absolute instants map the same; IANA diverges.
    // Public display ignores that and always shows the stored academy wall clock.
    const groupsWinter = buildPublicTimetableVenueGroups([
      schedule({
        id: "w",
        className: "Young Grapplers",
        dayOfWeek: 1,
        startTime: "16:30",
        endTime: "17:30",
      }),
    ]);
    const groupsSummer = buildPublicTimetableVenueGroups([
      schedule({
        id: "s",
        className: "Young Grapplers",
        dayOfWeek: 1,
        startTime: "16:30",
        endTime: "17:30",
      }),
    ]);

    assert.equal(groupsWinter[0].days[0].classes[0].timeRangeLabel, "4:30 pm–5:30 pm");
    assert.equal(groupsSummer[0].days[0].classes[0].timeRangeLabel, "4:30 pm–5:30 pm");
    assert.equal(groupsWinter[0].days[0].dayOfWeek, 1);
    assert.equal(groupsSummer[0].days[0].dayOfWeek, 1);
  });

  it("never moves weekday because of timezone conversion", () => {
    const schedules = [
      schedule({
        id: "late",
        className: "Night Class",
        dayOfWeek: 5,
        startTime: "22:00",
        endTime: "23:00",
        location: "Old Fort Bay",
      }),
      schedule({
        id: "early",
        className: "Breakfast",
        dayOfWeek: 0,
        startTime: "00:15",
        endTime: "01:00",
        location: "Old Fort Bay",
      }),
    ];

    const previous = process.env.TZ;

    try {
      for (const zone of ["Europe/London", "UTC", "America/Nassau", "Asia/Tokyo"]) {
        process.env.TZ = zone;
        const groups = buildPublicTimetableVenueGroups(schedules);
        const days = groups[0].days.map((day) => day.dayOfWeek);
        assert.deepEqual(days, [5, 0]);
        assert.equal(groups[0].days[0].classes[0].dayLabel, "Friday");
        assert.equal(groups[0].days[1].classes[0].dayLabel, "Sunday");
      }
    } finally {
      if (previous === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previous;
      }
    }
  });
});

describe("getClubIanaTimeZone", () => {
  it("configures Bahamas as America/Nassau and Kingston as Europe/London", () => {
    assert.equal(getClubIanaTimeZone(BAHAMAS_JIU_JITSU_CLUB_SLUG), "America/Nassau");
    assert.equal(getClubIanaTimeZone("BAHAMAS-JIU-JITSU"), "America/Nassau");
    assert.equal(getClubIanaTimeZone(KINGSTON_CLUB_SLUG), DEFAULT_CLUB_IANA_TIME_ZONE);
    assert.equal(getClubIanaTimeZone(KINGSTON_CLUB_SLUG), "Europe/London");
    assert.equal(
      getClubIanaTimeZone("kingston-jiu-jitsu-kids"),
      "Europe/London",
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

  it("orders venues by class count so the main venue is first; unassigned last", () => {
    const groups = buildPublicTimetableVenueGroups([
      schedule({
        id: "unassigned",
        className: "TBD Class",
        dayOfWeek: 2,
        startTime: "12:00",
        location: "  ",
      }),
      schedule({
        id: "tiffin-1",
        className: "Adult Gi",
        dayOfWeek: 1,
        startTime: "18:00",
        location: "Tiffin Sports Centre",
      }),
      schedule({
        id: "tiffin-2",
        className: "Fundamentals",
        dayOfWeek: 2,
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
    assert.equal(groups[0].venueName, "Tiffin Sports Centre");
    assert.equal(groups[1].venueName, "St. John's Parish Hall");
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

  it("matches live Bahamas recurring source records for display clocks", () => {
    // Snapshot of production active Bahamas schedules (source of truth for public page).
    const bahamasSchedules: PublicTimetableScheduleInput[] = [
      {
        id: "1",
        className: "Young Grapplers",
        dayOfWeek: 1,
        startTime: "16:30:00",
        endTime: "17:30:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "2",
        className: "Fundamentals",
        dayOfWeek: 1,
        startTime: "18:15:00",
        endTime: "19:30:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "3",
        className: "Adult No Gi",
        dayOfWeek: 2,
        startTime: "12:15:00",
        endTime: "13:15:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "4",
        className: "Adult No Gi",
        dayOfWeek: 2,
        startTime: "18:15:00",
        endTime: "19:30:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "5",
        className: "Young Grapplers",
        dayOfWeek: 3,
        startTime: "16:30:00",
        endTime: "17:30:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "6",
        className: "Adult Gi",
        dayOfWeek: 3,
        startTime: "18:15:00",
        endTime: "19:30:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "7",
        className: "Adult No Gi",
        dayOfWeek: 4,
        startTime: "12:15:00",
        endTime: "13:15:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "8",
        className: "Adult No Gi",
        dayOfWeek: 4,
        startTime: "18:15:00",
        endTime: "19:30:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "9",
        className: "Young Grapplers",
        dayOfWeek: 5,
        startTime: "16:30:00",
        endTime: "17:30:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
      {
        id: "10",
        className: "Adult Gi",
        dayOfWeek: 5,
        startTime: "18:15:00",
        endTime: "19:30:00",
        location: "Old Fort Bay Shopping Centre, Building B, Unit 8",
        isActive: true,
      },
    ];

    const groups = buildPublicTimetableVenueGroups(bahamasSchedules);
    const flat = groups.flatMap((venue) =>
      venue.days.flatMap((day) =>
        day.classes.map((entry) => ({
          day: entry.dayLabel,
          name: entry.className,
          range: entry.timeRangeLabel,
        })),
      ),
    );

    assert.deepEqual(flat, [
      { day: "Monday", name: "Young Grapplers", range: "4:30 pm–5:30 pm" },
      { day: "Monday", name: "Fundamentals", range: "6:15 pm–7:30 pm" },
      { day: "Tuesday", name: "Adult No Gi", range: "12:15 pm–1:15 pm" },
      { day: "Tuesday", name: "Adult No Gi", range: "6:15 pm–7:30 pm" },
      { day: "Wednesday", name: "Young Grapplers", range: "4:30 pm–5:30 pm" },
      { day: "Wednesday", name: "Adult Gi", range: "6:15 pm–7:30 pm" },
      { day: "Thursday", name: "Adult No Gi", range: "12:15 pm–1:15 pm" },
      { day: "Thursday", name: "Adult No Gi", range: "6:15 pm–7:30 pm" },
      { day: "Friday", name: "Young Grapplers", range: "4:30 pm–5:30 pm" },
      { day: "Friday", name: "Adult Gi", range: "6:15 pm–7:30 pm" },
    ]);
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
