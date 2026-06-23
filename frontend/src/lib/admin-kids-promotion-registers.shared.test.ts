import assert from "node:assert/strict";
import { test } from "node:test";
import type { PromotionCandidate } from "@/lib/admin-belt-promotion.shared";
import {
  filterJuniorPromotionCandidates,
  filterKidsPromotionRegisterDateGroups,
  filterKidsPromotionRegisterSessions,
  isKidsPromotionCandidatesOnRegistersClub,
  parseKidsPromotionRegistersFilter,
  type KidsPromotionRegisterSession,
} from "@/lib/admin-kids-promotion-registers.shared";
import {
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";

function buildCandidate(
  id: string,
  category: "junior" | "adult",
): PromotionCandidate {
  return {
    id,
    firstName: "Test",
    lastName: id,
    email: null,
    fullName: `Test ${id}`,
    currentBeltCategory: category,
    currentBeltSortOrder: 1000,
    assessment: {
      isEligible: true,
      currentBeltLabel: "Grey belt",
      nextBeltLabel: "Grey belt, 1 stripe",
      attendanceSinceAward: 4,
      requiredAttendance: 4,
      timeUnit: "weeks",
      timeSinceAward: 5,
      requiredTime: 5,
    },
  };
}

function buildSession(
  id: string,
  attendees: KidsPromotionRegisterSession["attendees"],
): KidsPromotionRegisterSession {
  const promotionCandidateCount = attendees.filter(
    (attendee) => attendee.isPromotionCandidate,
  ).length;

  return {
    id,
    className: "Kids BJJ",
    startsAt: "2026-06-24T17:00:00.000Z",
    endsAt: "2026-06-24T18:00:00.000Z",
    externalId: null,
    location: "Main mat",
    dateLabel: "24 Jun 2026",
    dayLabel: "Wednesday",
    timeLabel: "18:00 – 19:00",
    bookedCount: attendees.length,
    attendees,
    promotionCandidateCount,
  };
}

test("isKidsPromotionCandidatesOnRegistersClub is limited to Kingston Jiu Jitsu Kids", () => {
  assert.equal(
    isKidsPromotionCandidatesOnRegistersClub(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG),
    true,
  );
  assert.equal(isKidsPromotionCandidatesOnRegistersClub(KINGSTON_CLUB_SLUG), false);
});

test("parseKidsPromotionRegistersFilter defaults to all", () => {
  assert.equal(parseKidsPromotionRegistersFilter(undefined), "all");
  assert.equal(parseKidsPromotionRegistersFilter("candidates"), "candidates");
});

test("filterJuniorPromotionCandidates keeps junior belts only", () => {
  const candidates = [
    buildCandidate("junior-1", "junior"),
    buildCandidate("adult-1", "adult"),
  ];

  const filtered = filterJuniorPromotionCandidates(candidates);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "junior-1");
});

test("filterKidsPromotionRegisterSessions keeps only promotion candidates when filtered", () => {
  const sessions = [
    buildSession("session-1", [
      {
        attendeeId: "a-1",
        userId: "junior-1",
        firstName: "Alex",
        lastName: "One",
        fullName: "Alex One",
        attendanceStatus: "not_marked",
        isPromotionCandidate: true,
        promotionCandidate: buildCandidate("junior-1", "junior"),
      },
      {
        attendeeId: "a-2",
        userId: "student-2",
        firstName: "Sam",
        lastName: "Two",
        fullName: "Sam Two",
        attendanceStatus: "present",
        isPromotionCandidate: false,
        promotionCandidate: null,
      },
    ]),
    buildSession("session-2", [
      {
        attendeeId: "a-3",
        userId: "student-3",
        firstName: "Jamie",
        lastName: "Three",
        fullName: "Jamie Three",
        attendanceStatus: null,
        isPromotionCandidate: false,
        promotionCandidate: null,
      },
    ]),
  ];

  const filtered = filterKidsPromotionRegisterSessions(sessions, "candidates");

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "session-1");
  assert.equal(filtered[0]?.attendees.length, 1);
  assert.equal(filtered[0]?.attendees[0]?.userId, "junior-1");
});

test("filterKidsPromotionRegisterDateGroups removes empty dates in candidates mode", () => {
  const dateGroups = [
    {
      dateKey: "2026-06-24",
      dateLabel: "24 Jun 2026",
      dayLabel: "Wednesday",
      sessions: [
        buildSession("session-1", [
          {
            attendeeId: "a-1",
            userId: "junior-1",
            firstName: "Alex",
            lastName: "One",
            fullName: "Alex One",
            attendanceStatus: null,
            isPromotionCandidate: true,
            promotionCandidate: buildCandidate("junior-1", "junior"),
          },
        ]),
      ],
    },
    {
      dateKey: "2026-06-25",
      dateLabel: "25 Jun 2026",
      dayLabel: "Thursday",
      sessions: [
        buildSession("session-2", [
          {
            attendeeId: "a-2",
            userId: "student-2",
            firstName: "Sam",
            lastName: "Two",
            fullName: "Sam Two",
            attendanceStatus: null,
            isPromotionCandidate: false,
            promotionCandidate: null,
          },
        ]),
      ],
    },
  ];

  const filtered = filterKidsPromotionRegisterDateGroups(dateGroups, "candidates");

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.dateKey, "2026-06-24");
});
