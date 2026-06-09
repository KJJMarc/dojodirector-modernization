import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { matchesAdminStudentListStatusFilter } from "@/lib/admin-students";

/**
 * Documents programme student area count vs list alignment (no DB).
 * Card count = active programme_membership ∩ active club membership.
 * Programme list (default active filter) uses the same intersection.
 */
describe("programme student area membership filtering", () => {
  it("excludes inactive club members from the active list scope", () => {
    assert.equal(matchesAdminStudentListStatusFilter("inactive", "active"), false);
    assert.equal(matchesAdminStudentListStatusFilter("active", "active"), true);
  });

  it("still allows inactive club members when the admin list filter is inactive", () => {
    assert.equal(matchesAdminStudentListStatusFilter("inactive", "inactive"), true);
  });
});
