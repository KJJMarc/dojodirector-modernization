import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAdjacentKidsPromotionDatePath,
  buildDefaultExpandedKidsPromotionSessionIds,
  instructorPortalKidsPromotionCandidatesPath,
  isInstructorKidsPromotionCandidatesClub,
  listKidsPromotionCandidateSessionCards,
  prioritizeTodayKidsPromotionRegisterDateGroups,
  resolveInstructorKidsPromotionScheduleFilter,
  resolveInstructorKidsPromotionSelectedDateKey,
  shouldExpandKidsPromotionSessionByDefault,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import {
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";

function buildSession(id: string, startsAt: string) {
  return {
    id,
    className: `Class ${id}`,
    startsAt,
    endsAt: null,
    externalId: null,
    location: null,
    dateLabel: "Friday 19 June 2026",
    dayLabel: "Friday",
    timeLabel: "6:00pm",
    bookedCount: 1,
    promotionCandidateCount: 1,
    attendees: [
      {
        attendeeId: `attendee-${id}`,
        userId: `user-${id}`,
        firstName: "Test",
        lastName: id,
        fullName: `Test ${id}`,
        attendanceStatus: null,
        isPromotionCandidate: true,
        promotionCandidate: {
          id: `user-${id}`,
          firstName: "Test",
          lastName: id,
          email: null,
          fullName: `Test ${id}`,
          currentBeltCategory: "junior" as const,
          currentBeltSortOrder: 1000,
          assessment: {
            isEligible: true,
            currentBeltLabel: "Grey belt",
            nextBeltLabel: "Grey belt, 1 stripe",
            attendanceSinceAward: 4,
            requiredAttendance: 4,
            timeUnit: "weeks" as const,
            timeSinceAward: 5,
            requiredTime: 5,
          },
        },
      },
    ],
  };
}

test("isInstructorKidsPromotionCandidatesClub is kids-only", () => {
  assert.equal(
    isInstructorKidsPromotionCandidatesClub(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG),
    true,
  );
  assert.equal(isInstructorKidsPromotionCandidatesClub(KINGSTON_CLUB_SLUG), false);
});

test("instructorPortalKidsPromotionCandidatesPath uses instructor portal route", () => {
  assert.equal(
    instructorPortalKidsPromotionCandidatesPath(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG),
    "/instructor-portal/kingston-jiu-jitsu-kids/promotion-candidates",
  );
  assert.equal(
    instructorPortalKidsPromotionCandidatesPath(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG, {
      date: "2026-06-19",
    }),
    "/instructor-portal/kingston-jiu-jitsu-kids/promotion-candidates?date=2026-06-19",
  );
});

test("resolveInstructorKidsPromotionScheduleFilter defaults to today only", () => {
  const from = new Date("2026-06-19T12:00:00.000Z");
  const filter = resolveInstructorKidsPromotionScheduleFilter({}, from);

  assert.equal(filter.mode, "date-filter");
  assert.equal(filter.rangeStartKey, "2026-06-19");
  assert.equal(filter.rangeEndKey, "2026-06-19");
  assert.equal(filter.days, 1);
});

test("resolveInstructorKidsPromotionScheduleFilter uses explicit date param", () => {
  const filter = resolveInstructorKidsPromotionScheduleFilter({
    date: "2026-07-03",
  });

  assert.equal(filter.mode, "date-filter");
  assert.equal(filter.rangeStartKey, "2026-07-03");
  assert.equal(filter.rangeEndKey, "2026-07-03");
  assert.equal(filter.days, 1);
});

test("resolveInstructorKidsPromotionSelectedDateKey follows URL date param", () => {
  assert.equal(
    resolveInstructorKidsPromotionSelectedDateKey({ date: "2026-07-03" }),
    "2026-07-03",
  );
});

test("resolveInstructorKidsPromotionSelectedDateKey defaults to today without params", () => {
  const todayKey = "2026-06-19";
  assert.equal(
    resolveInstructorKidsPromotionSelectedDateKey(
      {},
      new Date(`${todayKey}T12:00:00.000Z`),
    ),
    todayKey,
  );
});

test("prioritizeTodayKidsPromotionRegisterDateGroups moves today first", () => {
  const todayKey = "2026-06-19";
  const groups = prioritizeTodayKidsPromotionRegisterDateGroups(
    [
      {
        dateKey: "2026-06-20",
        dateLabel: "Saturday 20 June 2026",
        dayLabel: "Saturday",
        sessions: [],
      },
      {
        dateKey: todayKey,
        dateLabel: "Friday 19 June 2026",
        dayLabel: "Friday",
        sessions: [],
      },
    ],
    new Date(`${todayKey}T12:00:00.000Z`),
  );

  assert.equal(groups[0]?.dateKey, todayKey);
  assert.equal(groups[0]?.dayLabel, "Today");
  assert.equal(groups[1]?.dateKey, "2026-06-20");
});

test("listKidsPromotionCandidateSessionCards returns all sessions for the day", () => {
  const cards = listKidsPromotionCandidateSessionCards(
    [
      {
        dateKey: "2026-06-19",
        dateLabel: "Friday 19 June 2026",
        dayLabel: "Friday",
        sessions: [
          buildSession("today", "2026-06-19T17:00:00.000Z"),
          {
            ...buildSession("empty", "2026-06-19T18:00:00.000Z"),
            promotionCandidateCount: 0,
            attendees: [],
          },
        ],
      },
    ],
    new Date("2026-06-19T12:00:00.000Z"),
  );

  assert.equal(cards.length, 2);
  assert.equal(cards[0]?.session.id, "today");
  assert.equal(cards[1]?.session.id, "empty");
  assert.equal(cards[1]?.session.promotionCandidateCount, 0);
});

test("shouldExpandKidsPromotionSessionByDefault expands selected viewing date", () => {
  assert.equal(shouldExpandKidsPromotionSessionByDefault("2026-07-03", "2026-07-03"), true);
  assert.equal(shouldExpandKidsPromotionSessionByDefault("2026-07-02", "2026-07-03"), false);
});

test("buildDefaultExpandedKidsPromotionSessionIds includes selected date sessions", () => {
  const cards = listKidsPromotionCandidateSessionCards(
    [
      {
        dateKey: "2026-07-03",
        dateLabel: "Friday 3 July 2026",
        dayLabel: "Friday",
        sessions: [buildSession("friday", "2026-07-03T17:00:00.000Z")],
      },
      {
        dateKey: "2026-07-04",
        dateLabel: "Saturday 4 July 2026",
        dayLabel: "Saturday",
        sessions: [buildSession("saturday", "2026-07-04T17:00:00.000Z")],
      },
    ],
    new Date("2026-07-03T12:00:00.000Z"),
  );

  assert.deepEqual(
    buildDefaultExpandedKidsPromotionSessionIds(cards, "2026-07-03"),
    ["friday"],
  );
});

test("buildDefaultExpandedKidsPromotionSessionIds includes today sessions", () => {
  const cards = listKidsPromotionCandidateSessionCards(
    [
      {
        dateKey: "2026-06-19",
        dateLabel: "Friday 19 June 2026",
        dayLabel: "Today",
        sessions: [buildSession("today", "2026-06-19T17:00:00.000Z")],
      },
      {
        dateKey: "2026-06-20",
        dateLabel: "Saturday 20 June 2026",
        dayLabel: "Saturday",
        sessions: [buildSession("future", "2026-06-20T17:00:00.000Z")],
      },
    ],
    new Date("2026-06-19T12:00:00.000Z"),
  );

  assert.deepEqual(
    buildDefaultExpandedKidsPromotionSessionIds(cards, "2026-06-19"),
    ["today"],
  );
});

test("buildAdjacentKidsPromotionDatePath steps by one day", () => {
  assert.equal(
    buildAdjacentKidsPromotionDatePath(
      KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
      "2026-06-19",
      -1,
    ),
    "/instructor-portal/kingston-jiu-jitsu-kids/promotion-candidates?date=2026-06-18",
  );
});
