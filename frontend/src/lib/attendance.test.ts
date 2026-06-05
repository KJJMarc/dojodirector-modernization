import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareAttendanceRegisterNames,
  sortByAttendanceRegisterName,
} from "./attendance.ts";

describe("compareAttendanceRegisterNames", () => {
  it("sorts by surname then first name", () => {
    assert.equal(
      compareAttendanceRegisterNames("Alex", "Silva", "Bob", "Silva"),
      -1,
    );
    assert.equal(
      compareAttendanceRegisterNames("Bob", "Adams", "Alex", "Silva"),
      -1,
    );
  });

  it("falls back to full name when surname is unavailable", () => {
    assert.equal(
      compareAttendanceRegisterNames("Charlie Brown", null, "Alex", null),
      1,
    );
  });
});

describe("sortByAttendanceRegisterName", () => {
  it("orders attendance register rows consistently", () => {
    const sorted = sortByAttendanceRegisterName(
      [
        { id: "1", firstName: "Zara", lastName: "Adams" },
        { id: "2", firstName: "Bob", lastName: "Silva" },
        { id: "3", firstName: "Alex", lastName: "Silva" },
        { id: "4", firstName: "Charlie Brown", lastName: null },
      ],
      (row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
      }),
    );

    assert.deepEqual(
      sorted.map((row) => row.id),
      ["1", "4", "3", "2"],
    );
  });
});
