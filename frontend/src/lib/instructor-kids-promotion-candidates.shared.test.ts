import assert from "node:assert/strict";
import { test } from "node:test";
import {
  instructorPortalKidsPromotionCandidatesPath,
  isInstructorKidsPromotionCandidatesClub,
  prioritizeTodayKidsPromotionRegisterDateGroups,
} from "@/lib/instructor-kids-promotion-candidates.shared";
import {
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";

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
