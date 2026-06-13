import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ATTENDANCE_KIOSK_GENERIC_ERROR_MESSAGE,
  ATTENDANCE_KIOSK_NOT_BOOKED_MESSAGE,
  ATTENDANCE_KIOSK_NOT_BOOKED_TITLE,
} from "@/lib/attendance-kiosk.shared";

describe("attendance kiosk messaging", () => {
  it("exposes the not-booked title and message copy", () => {
    assert.equal(
      ATTENDANCE_KIOSK_NOT_BOOKED_TITLE,
      "Student not booked for this session",
    );
    assert.equal(
      ATTENDANCE_KIOSK_NOT_BOOKED_MESSAGE,
      "This student is registered with the academy but is not currently booked into this class.",
    );
  });

  it("uses a generic production-safe error message", () => {
    assert.match(
      ATTENDANCE_KIOSK_GENERIC_ERROR_MESSAGE,
      /Unable to mark attendance/,
    );
    assert.doesNotMatch(ATTENDANCE_KIOSK_GENERIC_ERROR_MESSAGE, /Server Components/);
  });
});
