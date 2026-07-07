import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatBeltOptionLabel,
  formatBeltRankLabelWithStripes,
  getEffectiveBeltStripeCount,
  isPlainWhiteBeltLevel,
  shouldOfferBeltLevelInSelector,
} from "@/lib/admin-belt-levels.shared";
import { getNextBeltLevel } from "@/lib/admin-belt-promotion.shared";

describe("white belt framework", () => {
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
  const whiteTwoStripes = {
    id: "white-2",
    name: "White Belt 2 Stripes",
    stripe_count: 2,
    sort_order: 12,
    belt_category: "adult" as const,
  };
  const blueBelt = {
    id: "blue-0",
    name: "Blue Belt",
    stripe_count: 0,
    sort_order: 20,
    belt_category: "adult" as const,
  };

  it("treats plain adult white belt as one stripe for display", () => {
    assert.equal(isPlainWhiteBeltLevel(plainWhite), true);
    assert.equal(getEffectiveBeltStripeCount(plainWhite), 1);
    assert.equal(formatBeltOptionLabel(plainWhite), "White Belt – 1 Stripe");
  });

  it("formats adult white belt stripe ranks with en dashes", () => {
    assert.equal(formatBeltOptionLabel(whiteOneStripe), "White Belt – 1 Stripe");
    assert.equal(formatBeltOptionLabel(whiteTwoStripes), "White Belt – 2 Stripes");
  });

  it("does not rewrite non-white belts", () => {
    assert.equal(formatBeltOptionLabel(blueBelt), "Blue Belt");
    assert.equal(isPlainWhiteBeltLevel(blueBelt), false);
  });

  it("hides plain white belt from selectors", () => {
    assert.equal(shouldOfferBeltLevelInSelector(plainWhite), false);
    assert.equal(shouldOfferBeltLevelInSelector(whiteOneStripe), true);
  });

  it("skips plain white as a promotion target", () => {
    const next = getNextBeltLevel(null, [plainWhite, whiteOneStripe, blueBelt]);
    assert.equal(next?.id, whiteOneStripe.id);

    const afterPlainWhite = getNextBeltLevel(plainWhite.id, [
      plainWhite,
      whiteOneStripe,
      blueBelt,
    ]);
    assert.equal(afterPlainWhite?.id, whiteOneStripe.id);
  });

  it("formats stripe suffix helper from one stripe upward", () => {
    assert.equal(formatBeltRankLabelWithStripes("White Belt", 1), "White Belt – 1 Stripe");
    assert.equal(formatBeltRankLabelWithStripes("White Belt", 3), "White Belt – 3 Stripes");
  });
});
