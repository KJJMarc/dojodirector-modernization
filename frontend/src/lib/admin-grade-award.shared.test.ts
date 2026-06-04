import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canDeleteGradeAward,
  countRemainingGradeAwardsAfterDelete,
} from "@/lib/admin-grade-award.shared";

describe("canDeleteGradeAward", () => {
  it("allows delete when more than one award exists", () => {
    const awards = [{ id: "a-1" }, { id: "a-2" }];

    assert.equal(canDeleteGradeAward(awards, "a-1"), true);
  });

  it("blocks delete for the only remaining award", () => {
    const awards = [{ id: "a-1" }];

    assert.equal(canDeleteGradeAward(awards, "a-1"), false);
  });
});

describe("countRemainingGradeAwardsAfterDelete", () => {
  it("excludes the deleted award from the remaining count", () => {
    const awards = [{ id: "a-1" }, { id: "a-2" }, { id: "a-3" }];

    assert.equal(countRemainingGradeAwardsAfterDelete(awards, "a-2"), 2);
  });
});
