import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareJuniorBeltRankingGroups,
  compareJuniorBeltStripeGroups,
  getJuniorBeltSectionKey,
  getJuniorBeltSectionSortKey,
  parseJuniorBeltRankParts,
  parseJuniorBeltRankPartsFromName,
} from "@/lib/junior-belt-rankings.shared";

describe("parseJuniorBeltRankParts", () => {
  it("parses live junior belt names and colour fields", () => {
    assert.deepEqual(parseJuniorBeltRankParts("Junior Green Black", 4, "green_black"), {
      baseColor: "green",
      centerVariant: "black",
      stripeCount: 4,
    });

    assert.deepEqual(parseJuniorBeltRankParts("Junior Green White 2 Stripes", 2, "green_white"), {
      baseColor: "green",
      centerVariant: "white",
      stripeCount: 2,
    });

    assert.deepEqual(parseJuniorBeltRankParts("Junior Green", 0, "green"), {
      baseColor: "green",
      centerVariant: "plain",
      stripeCount: 0,
    });

    assert.deepEqual(parseJuniorBeltRankParts("Junior Grey White", 1, "grey_white"), {
      baseColor: "grey",
      centerVariant: "white",
      stripeCount: 1,
    });
  });

  it("does not collapse mixed belts into plain colour belts", () => {
    const greenWhite = parseJuniorBeltRankPartsFromName("Junior Green White");
    const greenPlain = parseJuniorBeltRankPartsFromName("Junior Green");

    assert.notEqual(getJuniorBeltSectionKey(greenWhite), getJuniorBeltSectionKey(greenPlain));
    assert.equal(greenWhite.centerVariant, "white");
    assert.equal(greenPlain.centerVariant, "plain");
  });
});

describe("getJuniorBeltSectionKey", () => {
  it("uses hyphenated keys for colour bar lookup", () => {
    assert.equal(
      getJuniorBeltSectionKey(parseJuniorBeltRankParts("Junior Orange Black", 0, "orange_black")),
      "orange-black",
    );
    assert.equal(
      getJuniorBeltSectionKey(parseJuniorBeltRankParts("Junior Yellow White", 0, "yellow_white")),
      "yellow-white",
    );
    assert.equal(
      getJuniorBeltSectionKey(parseJuniorBeltRankParts("Junior Orange", 0, "orange")),
      "orange",
    );
    assert.equal(
      getJuniorBeltSectionKey(parseJuniorBeltRankParts("Junior White", 0, "white")),
      "white",
    );
  });

  it("normalises junior belt name variants to the same section key", () => {
    const fromDbName = parseJuniorBeltRankPartsFromName("Junior Orange Black");
    const fromDisplayName = parseJuniorBeltRankPartsFromName("Orange & Black Belt");
    const fromLabel = parseJuniorBeltRankPartsFromName("Orange Black");

    assert.equal(getJuniorBeltSectionKey(fromDbName), getJuniorBeltSectionKey(fromDisplayName));
    assert.equal(getJuniorBeltSectionKey(fromDbName), getJuniorBeltSectionKey(fromLabel));
    assert.equal(getJuniorBeltSectionKey(fromDbName), "orange-black");
  });
});

describe("compareJuniorBeltRankingGroups", () => {
  it("orders belt sections highest to lowest using explicit hierarchy", () => {
    const groups = [
      {
        sectionLabel: "White Belt",
        rankSortKey: getJuniorBeltSectionSortKey(parseJuniorBeltRankParts("Junior White", 0, "white")),
      },
      {
        sectionLabel: "Green & Black Belt",
        rankSortKey: getJuniorBeltSectionSortKey(
          parseJuniorBeltRankParts("Junior Green Black", 0, "green_black"),
        ),
      },
      {
        sectionLabel: "Orange Belt",
        rankSortKey: getJuniorBeltSectionSortKey(parseJuniorBeltRankParts("Junior Orange", 0, "orange")),
      },
      {
        sectionLabel: "Green & White Belt",
        rankSortKey: getJuniorBeltSectionSortKey(
          parseJuniorBeltRankParts("Junior Green White", 0, "green_white"),
        ),
      },
      {
        sectionLabel: "Yellow & Black Belt",
        rankSortKey: getJuniorBeltSectionSortKey(
          parseJuniorBeltRankParts("Junior Yellow Black", 0, "yellow_black"),
        ),
      },
    ].sort(compareJuniorBeltRankingGroups);

    assert.deepEqual(
      groups.map((group) => group.sectionLabel),
      [
        "Green & Black Belt",
        "Green & White Belt",
        "Orange Belt",
        "Yellow & Black Belt",
        "White Belt",
      ],
    );
  });
});

describe("compareJuniorBeltStripeGroups", () => {
  it("orders higher stripe counts before lower within the same belt", () => {
    const groups = [
      { rankLabel: "Junior Green 1 Stripe", stripeCount: 1, beltSortOrder: 100 },
      { rankLabel: "Junior Green 4 Stripes", stripeCount: 4, beltSortOrder: 100 },
      { rankLabel: "Junior Green", stripeCount: 0, beltSortOrder: 100 },
    ].sort(compareJuniorBeltStripeGroups);

    assert.deepEqual(groups.map((group) => group.rankLabel), [
      "Junior Green 4 Stripes",
      "Junior Green 1 Stripe",
      "Junior Green",
    ]);
  });
});
