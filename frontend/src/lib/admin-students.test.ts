import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAdminStudentsListHref,
  filterAdminStudents,
  formatAdminStudentCountLabel,
  matchesAdminStudentListStatusFilter,
  parseAdminStudentStatusFilter,
  sortAdminStudents,
  type AdminStudent,
} from "./admin-students.ts";

function buildStudent(overrides: Partial<AdminStudent> = {}): AdminStudent {
  return {
    id: "student-1",
    firstName: "Alex",
    lastName: "Silva",
    email: "alex@example.com",
    role: "student",
    membershipStatus: "active",
    originalLeadSource: null,
    originalLeadSourceLabel: null,
    beltLabel: "White Belt",
    beltSortOrder: 1,
    attendanceTotal: 10,
    considerPromotion: false,
    ...overrides,
  };
}

describe("parseAdminStudentStatusFilter", () => {
  it("defaults to active", () => {
    assert.equal(parseAdminStudentStatusFilter(undefined), "active");
    assert.equal(parseAdminStudentStatusFilter("unknown"), "active");
  });

  it("parses supported filters", () => {
    assert.equal(parseAdminStudentStatusFilter("all"), "all");
    assert.equal(parseAdminStudentStatusFilter("paused"), "paused");
    assert.equal(parseAdminStudentStatusFilter("inactive"), "inactive");
  });
});

describe("matchesAdminStudentListStatusFilter", () => {
  it("matches active, paused and inactive statuses", () => {
    assert.equal(matchesAdminStudentListStatusFilter("active", "active"), true);
    assert.equal(matchesAdminStudentListStatusFilter("paused", "active"), false);
    assert.equal(matchesAdminStudentListStatusFilter("suspended", "paused"), true);
    assert.equal(matchesAdminStudentListStatusFilter("inactive", "inactive"), true);
    assert.equal(matchesAdminStudentListStatusFilter("archived", "inactive"), true);
    assert.equal(matchesAdminStudentListStatusFilter("paused", "all"), true);
  });
});

describe("formatAdminStudentCountLabel", () => {
  it("formats status-specific labels", () => {
    assert.equal(
      formatAdminStudentCountLabel({
        count: 213,
        filter: "active",
        memberLabel: "BJJ student",
        memberLabelPlural: "BJJ students",
      }),
      "213 Active BJJ students",
    );
    assert.equal(
      formatAdminStudentCountLabel({
        count: 12,
        filter: "paused",
        memberLabel: "BJJ student",
        memberLabelPlural: "BJJ students",
      }),
      "12 Paused BJJ students",
    );
    assert.equal(
      formatAdminStudentCountLabel({
        count: 230,
        filter: "all",
        memberLabel: "BJJ student",
        memberLabelPlural: "BJJ students",
      }),
      "230 BJJ students",
    );
  });

  it("includes search-filtered counts", () => {
    assert.equal(
      formatAdminStudentCountLabel({
        count: 213,
        filter: "active",
        memberLabel: "BJJ student",
        memberLabelPlural: "BJJ students",
        visibleCount: 5,
      }),
      "5 of 213 Active BJJ students",
    );
  });
});

describe("buildAdminStudentsListHref", () => {
  it("omits status for the default active filter", () => {
    const href = buildAdminStudentsListHref({
      clubSlug: "kingston-jiu-jitsu",
      sort: "last_name",
      dir: "asc",
    });

    assert.equal(href.includes("status="), false);
  });

  it("preserves non-default status filters", () => {
    const href = buildAdminStudentsListHref({
      clubSlug: "kingston-jiu-jitsu",
      sort: "last_name",
      dir: "asc",
      statusFilter: "paused",
      searchQuery: "alex",
    });

    assert.match(href, /status=paused/);
    assert.match(href, /q=alex/);
  });
});

describe("student list filtering with search and sort", () => {
  it("filters by search within the supplied status-scoped list", () => {
    const students = [
      buildStudent({ id: "1", firstName: "Alex" }),
      buildStudent({ id: "2", firstName: "Jamie" }),
    ];

    const filtered = filterAdminStudents(students, "alex");
    const sorted = sortAdminStudents(filtered);

    assert.equal(filtered.length, 1);
    assert.equal(sorted[0]?.firstName, "Alex");
  });
});
