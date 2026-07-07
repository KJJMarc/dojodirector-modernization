import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseAwardedAtInput,
  validateAwardBeltLevelSelection,
} from "@/lib/admin-change-belt.shared";

describe("parseAwardedAtInput", () => {
  it("accepts YYYY-MM-DD dates", () => {
    assert.deepEqual(parseAwardedAtInput("2026-06-24"), { ok: true });
  });

  it("rejects invalid date formats", () => {
    const result = parseAwardedAtInput("24/06/2026");

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.code, "invalid_date");
    }
  });
});

describe("validateAwardBeltLevelSelection", () => {
  const juniorThreeStripe = {
    id: "junior-3",
    name: "Junior Grey 3 Stripes",
    stripe_count: 3,
    belt_category: "junior",
    is_active: true,
  };

  const juniorFourStripeRetired = {
    id: "junior-4",
    name: "Junior Grey 4 Stripes",
    stripe_count: 4,
    belt_category: "junior",
    is_active: false,
  };

  const nextJuniorBase = {
    id: "junior-base",
    name: "Junior Grey Belt",
    stripe_count: 0,
    belt_category: "junior",
    is_active: true,
  };

  const adultBlue = {
    id: "adult-blue",
    name: "Blue Belt",
    stripe_count: 0,
    belt_category: "adult",
    is_active: true,
  };

  it("allows promoting a junior student off a retired 4-stripe belt to an active junior belt", () => {
    const result = validateAwardBeltLevelSelection({
      currentBelt: juniorFourStripeRetired,
      selectedBelt: nextJuniorBase,
    });

    assert.deepEqual(result, { ok: true });
  });

  it("rejects inactive selected belts", () => {
    const result = validateAwardBeltLevelSelection({
      currentBelt: juniorThreeStripe,
      selectedBelt: juniorFourStripeRetired,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.code, "inactive_belt");
    }
  });

  it("rejects switching between junior and adult belt categories", () => {
    const result = validateAwardBeltLevelSelection({
      currentBelt: juniorThreeStripe,
      selectedBelt: adultBlue,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.code, "category_mismatch");
    }
  });

  it("rejects plain white belt as a promotion target", () => {
    const plainWhite = {
      id: "white-0",
      name: "White Belt",
      stripe_count: 0,
      belt_category: "adult",
      is_active: true,
    };

    const result = validateAwardBeltLevelSelection({
      currentBelt: null,
      selectedBelt: plainWhite,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.code, "unsupported_rank");
    }
  });
});
