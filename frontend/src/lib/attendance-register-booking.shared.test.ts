import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countsAsAttendanceRegisterStudent,
  countsTowardAttendanceRegister,
} from "./attendance-register-booking.shared.ts";

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

describe("countsAsAttendanceRegisterStudent", () => {
  it("requires booked/walk_in status and a user id", () => {
    assert.equal(
      countsAsAttendanceRegisterStudent({ booking_status: "booked", user_id: "user-1" }),
      true,
    );
    assert.equal(
      countsAsAttendanceRegisterStudent({ booking_status: "walk_in", user_id: "user-1" }),
      true,
    );
    assert.equal(
      countsAsAttendanceRegisterStudent({ booking_status: "booked", user_id: null }),
      false,
    );
    assert.equal(
      countsAsAttendanceRegisterStudent({ booking_status: "waitlisted", user_id: "user-1" }),
      false,
    );
  });
});
