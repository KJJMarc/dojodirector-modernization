import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveLeadStatusAfterAttendanceRegisterMark,
  shouldUpdateLeadFromAttendanceRegisterMark,
} from "@/lib/lead-status-tracking.shared";

test("resolveLeadStatusAfterAttendanceRegisterMark maps register marks to lead statuses", () => {
  assert.equal(resolveLeadStatusAfterAttendanceRegisterMark("present"), "trial_attended");
  assert.equal(resolveLeadStatusAfterAttendanceRegisterMark("absent"), "trial_missed");
});

test("shouldUpdateLeadFromAttendanceRegisterMark allows present for booked enquiries", () => {
  assert.equal(
    shouldUpdateLeadFromAttendanceRegisterMark(
      { status: "trial_booked", trial_attended_at: null },
      "present",
    ),
    true,
  );
  assert.equal(
    shouldUpdateLeadFromAttendanceRegisterMark(
      { status: "new_enquiry", trial_attended_at: null },
      "present",
    ),
    true,
  );
});

test("shouldUpdateLeadFromAttendanceRegisterMark skips joined and attended leads", () => {
  assert.equal(
    shouldUpdateLeadFromAttendanceRegisterMark(
      { status: "joined", trial_attended_at: null },
      "present",
    ),
    false,
  );
  assert.equal(
    shouldUpdateLeadFromAttendanceRegisterMark(
      { status: "trial_attended", trial_attended_at: "2026-06-01T10:00:00.000Z" },
      "present",
    ),
    false,
  );
  assert.equal(
    shouldUpdateLeadFromAttendanceRegisterMark(
      { status: "trial_attended", trial_attended_at: "2026-06-01T10:00:00.000Z" },
      "absent",
    ),
    false,
  );
});

test("shouldUpdateLeadFromAttendanceRegisterMark backfills missing attended timestamp", () => {
  assert.equal(
    shouldUpdateLeadFromAttendanceRegisterMark(
      { status: "trial_attended", trial_attended_at: null },
      "present",
    ),
    true,
  );
});

test("shouldUpdateLeadFromAttendanceRegisterMark allows absent for booked trials", () => {
  assert.equal(
    shouldUpdateLeadFromAttendanceRegisterMark(
      { status: "trial_booked", trial_attended_at: null },
      "absent",
    ),
    true,
  );
});

test("shouldUpdateLeadFromAttendanceRegisterMark allows present after a missed trial", () => {
  assert.equal(
    shouldUpdateLeadFromAttendanceRegisterMark(
      { status: "trial_missed", trial_attended_at: null },
      "present",
    ),
    true,
  );
});
