import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudentRetentionRiskSummary,
  computeStudentRetentionScore,
  type AdminStudentRetentionRow,
} from "./admin-student-retention.shared.ts";
import { isActiveMembershipStatus } from "./membership-status.shared.ts";

function isActiveStudentClubMembership(membership: {
  role: string | null | undefined;
  status: string | null | undefined;
}) {
  return membership.role === "student" && isActiveMembershipStatus(membership.status);
}

describe("active student retention eligibility", () => {
  it("includes active students", () => {
    assert.equal(
      isActiveStudentClubMembership({ role: "student", status: "active" }),
      true,
    );
  });

  it("excludes paused, inactive, suspended and archived students", () => {
    for (const status of ["paused", "inactive", "suspended", "archived"]) {
      assert.equal(
        isActiveStudentClubMembership({ role: "student", status }),
        false,
        `expected ${status} to be excluded`,
      );
    }
  });

  it("excludes non-student roles even when active", () => {
    assert.equal(
      isActiveStudentClubMembership({ role: "instructor", status: "active" }),
      false,
    );
  });
});

describe("buildStudentRetentionRiskSummary", () => {
  it("counts only the supplied active-student rows", () => {
    const rows: AdminStudentRetentionRow[] = [
      {
        userId: "1",
        fullName: "Active High",
        beltLabel: null,
        profileHref: "/profile/1",
        lastAttendanceDate: null,
        daysSinceLastAttendance: 40,
        attendanceLast30Days: 0,
        futureBookingsCount: 0,
        score: 85,
        level: "critical",
        reasons: [],
        suggestedActions: [],
      },
      {
        userId: "2",
        fullName: "Active Medium",
        beltLabel: null,
        profileHref: "/profile/2",
        lastAttendanceDate: "2026-05-01",
        daysSinceLastAttendance: 15,
        attendanceLast30Days: 1,
        futureBookingsCount: 0,
        score: 35,
        level: "medium",
        reasons: [],
        suggestedActions: [],
      },
      {
        userId: "3",
        fullName: "Active Low",
        beltLabel: null,
        profileHref: "/profile/3",
        lastAttendanceDate: "2026-05-28",
        daysSinceLastAttendance: 2,
        attendanceLast30Days: 6,
        futureBookingsCount: 2,
        score: 0,
        level: "low",
        reasons: [],
        suggestedActions: [],
      },
    ];

    assert.deepEqual(buildStudentRetentionRiskSummary(rows), {
      totalActiveStudents: 3,
      redCount: 1,
      amberCount: 1,
      greenCount: 1,
    });
  });
});

describe("computeStudentRetentionScore membership status", () => {
  it("flags non-active membership status in the score model", () => {
    const result = computeStudentRetentionScore({
      daysSinceLastAttendance: 2,
      attendanceLast30Days: 4,
      futureBookingsCount: 1,
      membershipStatus: "paused",
      daysSinceJoined: 120,
      daysSinceLastGrade: 30,
      hasGradeData: true,
    });

    assert.ok(
      result.reasons.some((reason) => reason.id === "membership"),
      "paused membership should add a membership risk reason",
    );
  });
});
