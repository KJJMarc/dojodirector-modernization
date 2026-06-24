import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRecentPromotionEntries,
  compareGradeAwardRecency,
  filterJuniorBeltLevelsForPromotion,
  pickLatestGradeAwardForUser,
  sortGradeAwardsNewestFirst,
} from "@/lib/admin-belt-promotion.shared";

describe("compareGradeAwardRecency", () => {
  it("prefers the later created award on the same awarded_at day", () => {
    const awards = sortGradeAwardsNewestFirst([
      {
        id: "award-green",
        user_id: "user-1",
        belt_level_id: "green",
        awarded_at: "2026-06-03",
        created_at: "2026-06-03T09:00:00.000Z",
        updated_at: "2026-06-03T09:00:00.000Z",
      },
      {
        id: "award-blue",
        user_id: "user-1",
        belt_level_id: "blue",
        awarded_at: "2026-06-03",
        created_at: "2026-06-03T11:30:00.000Z",
        updated_at: "2026-06-03T11:30:00.000Z",
      },
    ]);

    assert.equal(awards[0]?.belt_level_id, "blue");
    assert.equal(
      pickLatestGradeAwardForUser("user-1", awards)?.belt_level_id,
      "blue",
    );
    assert.ok(
      compareGradeAwardRecency(awards[0]!, awards[1]!) > 0,
    );
  });
});

describe("buildRecentPromotionEntries", () => {
  it("shows one recent promotion per student using their latest award", () => {
    const userId = "user-1";
    const promotions = buildRecentPromotionEntries({
      activeMemberUserIds: new Set([userId]),
      awardsByUserId: new Map([
        [
          userId,
          [
            {
              id: "award-green",
              user_id: userId,
              belt_level_id: "green",
              awarded_at: "2026-06-03",
              created_at: "2026-06-03T09:00:00.000Z",
              updated_at: "2026-06-03T09:00:00.000Z",
            },
            {
              id: "award-blue",
              user_id: userId,
              belt_level_id: "blue",
              awarded_at: "2026-06-03",
              created_at: "2026-06-03T11:30:00.000Z",
              updated_at: "2026-06-03T11:30:00.000Z",
            },
          ],
        ],
      ]),
      cutoffDate: new Date("2026-06-01T00:00:00.000Z"),
      getStudentName: () => "Marc TEST",
      formatNewRankLabel: (beltLevelId) => beltLevelId ?? "Not set",
      formatPreviousRankLabel: (beltLevelId) => beltLevelId ?? "Not set",
      formatPromotionDateLabel: (awardedAt) => awardedAt,
    });

    assert.equal(promotions.length, 1);
    assert.equal(promotions[0]?.newRankLabel, "blue");
    assert.equal(promotions[0]?.previousRankLabel, "green");
  });
});

describe("filterJuniorBeltLevelsForPromotion", () => {
  it("excludes inactive junior belts from promotion progression", () => {
    const belts = filterJuniorBeltLevelsForPromotion([
      {
        id: "active",
        name: "Junior Grey 3 Stripes",
        stripe_count: 3,
        sort_order: 1013,
        belt_category: "junior",
        is_active: true,
      },
      {
        id: "retired",
        name: "Junior Grey 4 Stripes",
        stripe_count: 4,
        sort_order: 1014,
        belt_category: "junior",
        is_active: false,
      },
    ]);

    assert.deepEqual(
      belts.map((belt) => belt.id),
      ["active"],
    );
  });
});
