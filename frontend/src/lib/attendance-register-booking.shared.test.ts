import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countsTowardAttendanceRegister } from "./attendance-register-booking.shared.ts";

describe("countsTowardAttendanceRegister", () => {
  it("includes booked and walk_in statuses", () => {
    assert.equal(countsTowardAttendanceRegister("booked"), true);
    assert.equal(countsTowardAttendanceRegister("walk_in"), true);
  });

  it("excludes waitlisted and cancelled statuses", () => {
    assert.equal(countsTowardAttendanceRegister("waitlisted"), false);
    assert.equal(countsTowardAttendanceRegister("cancelled"), false);
    assert.equal(countsTowardAttendanceRegister(null), false);
  });
});
