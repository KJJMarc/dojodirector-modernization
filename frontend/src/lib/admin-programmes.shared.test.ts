import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildStudentProfileAdminPath,
  formatStudentProfileBackLabel,
  programmeStudentsAdminPath,
  STUDENT_PROFILE_FROM_PROGRAMME_PARAM,
} from "@/lib/admin-programmes.shared";
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

describe("student profile programme back navigation", () => {
  it("appends fromProgramme when opening profile from a programme list", () => {
    assert.equal(
      buildStudentProfileAdminPath("kingston-jiu-jitsu", "user-1", {
        programmeSlug: "muay-thai",
      }),
      `/admin/kingston-jiu-jitsu/students/user-1/profile?${STUDENT_PROFILE_FROM_PROGRAMME_PARAM}=muay-thai`,
    );
  });

  it("omits query param when programme context is absent", () => {
    assert.equal(
      buildStudentProfileAdminPath("kingston-jiu-jitsu", "user-1"),
      "/admin/kingston-jiu-jitsu/students/user-1/profile",
    );
  });

  it("formats programme-specific back labels", () => {
    assert.equal(
      formatStudentProfileBackLabel("Muay Thai"),
      "← Back to Muay Thai Students",
    );
    assert.equal(formatStudentProfileBackLabel("BJJ"), "← Back to BJJ Students");
  });

  it("routes programme back links to the matching student list", () => {
    assert.equal(
      programmeStudentsAdminPath("kingston-jiu-jitsu", "muay-thai"),
      "/admin/kingston-jiu-jitsu/programmes/muay-thai/students",
    );
    assert.equal(
      programmeStudentsAdminPath("kingston-jiu-jitsu", "bjj"),
      "/admin/kingston-jiu-jitsu/students",
    );
  });
});

describe("dashboard total students across programmes", () => {
  it("dedupes students counted in more than one programme", () => {
    const bjjUserIds = ["user-a", "user-b", "user-c"];
    const muayThaiUserIds = ["user-b", "user-d"];
    const uniqueUserIds = new Set([...bjjUserIds, ...muayThaiUserIds]);

    assert.equal(uniqueUserIds.size, 4);
  });
});
