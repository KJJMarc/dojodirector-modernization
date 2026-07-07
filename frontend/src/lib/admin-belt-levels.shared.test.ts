import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatBeltOptionLabel,
  toBeltLevelOptions,
} from "@/lib/admin-belt-levels.shared";
import { getNextBeltLevel } from "@/lib/admin-belt-promotion.shared";
import { shouldIncludeRankedStudent } from "@/lib/adult-belt-rankings.shared";
import { shouldIncludeJuniorRankedStudent } from "@/lib/junior-belt-rankings.shared";

describe("admin belt labels and selectors", () => {
  const plainWhite = {
    id: "white-0",
    name: "White Belt",
    stripe_count: 0,
    sort_order: 10,
    belt_category: "adult" as const,
  };
  const whiteOneStripe = {
    id: "white-1",
    name: "White Belt 1 Stripe",
    stripe_count: 1,
    sort_order: 11,
    belt_category: "adult" as const,
  };

  it("shows plain White Belt in admin labels", () => {
    assert.equal(formatBeltOptionLabel(plainWhite), "White Belt");
    assert.equal(formatBeltOptionLabel(whiteOneStripe), "White Belt 1 Stripe");
  });

  it("includes plain White Belt in selectors", () => {
    const options = toBeltLevelOptions([plainWhite, whiteOneStripe]);

    assert.deepEqual(
      options.map((option) => option.id),
      ["white-0", "white-1"],
    );
  });
});

describe("promotion progression from White Belt", () => {
  const plainWhite = {
    id: "white-0",
    name: "White Belt",
    stripe_count: 0,
    sort_order: 10,
    belt_category: "adult" as const,
  };
  const whiteOneStripe = {
    id: "white-1",
    name: "White Belt 1 Stripe",
    stripe_count: 1,
    sort_order: 11,
    belt_category: "adult" as const,
  };

  it("promotes White Belt to White Belt 1 Stripe", () => {
    const belts = [plainWhite, whiteOneStripe];
    const next = getNextBeltLevel(plainWhite.id, belts);

    assert.equal(next?.id, whiteOneStripe.id);
    assert.equal(next?.name, "White Belt 1 Stripe");
  });

  it("uses White Belt as the first rank when unranked", () => {
    const first = getNextBeltLevel(null, [plainWhite, whiteOneStripe]);

    assert.equal(first?.id, plainWhite.id);
    assert.equal(first?.name, "White Belt");
  });
});

describe("public belt rankings display filters", () => {
  it("hides standalone White Belt on adult public rankings only", () => {
    assert.equal(shouldIncludeRankedStudent("white", 0), false);
    assert.equal(shouldIncludeRankedStudent("white", 1), true);
    assert.equal(shouldIncludeRankedStudent("blue", 0), true);
  });

  it("hides plain junior white on public junior rankings only", () => {
    assert.equal(shouldIncludeJuniorRankedStudent("white", 0), false);
    assert.equal(shouldIncludeJuniorRankedStudent("white", 1), true);
    assert.equal(shouldIncludeJuniorRankedStudent("grey", 0), true);
  });
});
