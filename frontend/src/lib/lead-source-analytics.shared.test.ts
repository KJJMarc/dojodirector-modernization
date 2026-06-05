import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterAdminStudents, type AdminStudent } from "./admin-students.ts";
import {
  filterLeadSourceAttributionRecords,
  type LeadSourceAttributionRecord,
} from "./lead-source-analytics.shared.ts";

function buildStudent(overrides: Partial<AdminStudent> = {}): AdminStudent {
  return {
    id: "student-1",
    firstName: "Alex",
    lastName: "Silva",
    email: "alex@example.com",
    role: "student",
    originalLeadSource: "google_ads",
    originalLeadSourceLabel: "Google Ads",
    beltLabel: "White Belt",
    beltSortOrder: 1,
    attendanceTotal: 10,
    considerPromotion: false,
    ...overrides,
  };
}

function buildAttributionRecord(
  overrides: Partial<LeadSourceAttributionRecord> = {},
): LeadSourceAttributionRecord {
  return {
    id: "record-1",
    recordType: "lead",
    name: "Alex Silva",
    email: "alex@example.com",
    originalLeadSource: "google_ads",
    originalLeadSourceLabel: "Google Ads",
    statusLabel: "New",
    ...overrides,
  };
}

describe("filterAdminStudents", () => {
  it("matches first name, last name, and email only", () => {
    const students = [buildStudent()];

    assert.deepEqual(filterAdminStudents(students, "alex"), students);
    assert.deepEqual(filterAdminStudents(students, "silva"), students);
    assert.deepEqual(filterAdminStudents(students, "alex@example.com"), students);
    assert.deepEqual(filterAdminStudents(students, "google"), []);
  });
});

describe("filterLeadSourceAttributionRecords", () => {
  it("matches name, email, and lead source label", () => {
    const records = [buildAttributionRecord()];

    assert.deepEqual(filterLeadSourceAttributionRecords(records, "alex"), records);
    assert.deepEqual(
      filterLeadSourceAttributionRecords(records, "alex@example.com"),
      records,
    );
    assert.deepEqual(filterLeadSourceAttributionRecords(records, "google ads"), records);
  });

  it("filters by original lead source dropdown value", () => {
    const records = [
      buildAttributionRecord(),
      buildAttributionRecord({
        id: "record-2",
        originalLeadSource: "referral",
        originalLeadSourceLabel: "Referral",
      }),
    ];

    assert.equal(
      filterLeadSourceAttributionRecords(records, undefined, "referral").length,
      1,
    );
  });
});
