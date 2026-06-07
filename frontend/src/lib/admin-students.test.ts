import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAdminStudentsListHref,
  filterAdminStudents,
  formatAdminStudentCountLabel,
  formatStudentRole,
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
  it("defaults to all students", () => {
    assert.equal(parseAdminStudentStatusFilter(undefined), "all");
    assert.equal(parseAdminStudentStatusFilter("unknown"), "all");
  });

  it("parses supported filters", () => {
    assert.equal(parseAdminStudentStatusFilter("active"), "active");
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
  it("omits status for the default all-students filter", () => {
    const href = buildAdminStudentsListHref({
      clubSlug: "kingston-jiu-jitsu",
      sort: "last_name",
      dir: "asc",
    });

    assert.equal(href.includes("status="), false);
  });

  it("preserves non-default status filters", () => {
    const activeHref = buildAdminStudentsListHref({
      clubSlug: "kingston-jiu-jitsu",
      sort: "last_name",
      dir: "asc",
      statusFilter: "active",
    });
    const pausedHref = buildAdminStudentsListHref({
      clubSlug: "kingston-jiu-jitsu",
      sort: "last_name",
      dir: "asc",
      statusFilter: "paused",
      searchQuery: "alex",
    });

    assert.match(activeHref, /status=active/);
    assert.match(pausedHref, /status=paused/);
    assert.match(pausedHref, /q=alex/);
  });
});

describe("formatStudentRole", () => {
  it("formats academy membership roles for the students list", () => {
    assert.equal(formatStudentRole("student"), "Student");
    assert.equal(formatStudentRole("instructor"), "Instructor");
    assert.equal(formatStudentRole("admin"), "Admin");
    assert.equal(formatStudentRole("super_admin"), "Super Admin");
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

  it("finds admins and instructors by name or email", () => {
    const students = [
      buildStudent({
        id: "1",
        firstName: "Marc",
        lastName: "Barton",
        email: "marc@example.com",
        role: "admin",
      }),
      buildStudent({
        id: "2",
        firstName: "Jamie",
        lastName: "Silva",
        role: "student",
      }),
    ];

    const filtered = filterAdminStudents(students, "barton");

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.role, "admin");
    assert.equal(filtered[0]?.lastName, "Barton");
  });
});
