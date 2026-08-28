import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatNoShowTrackingStatusLabel,
  hasNoShowEligibilityWindowPassed,
  isNoShow,
  isNoShowTrackingEligibleStudentMembership,
  calculateAverageAttendancePerSession,
  isRetrospectiveMetricsSession,
  NO_SHOW_REGISTER_GRACE_MS,
  resolveNoShowTrackingStatus,
} from "@/lib/admin-class-metrics.shared";

const SESSION_START = "2026-06-05T18:00:00.000Z";
const SESSION_END = "2026-06-05T19:00:00.000Z";

function session(overrides: Partial<{ starts_at: string; ends_at: string | null; status: string | null }> = {}) {
  return {
    starts_at: SESSION_START,
    ends_at: SESSION_END,
    status: "scheduled" as string | null,
    ...overrides,
  };
}

function msAfterEnd(minutes: number) {
  return new Date(
    new Date(SESSION_END).getTime() + minutes * 60 * 1000,
  ).toISOString();
}

describe("calculateAverageAttendancePerSession", () => {
  it("returns total attendance divided by sessions with present marks", () => {
    assert.equal(calculateAverageAttendancePerSession(740, 37), 20);
    assert.equal(calculateAverageAttendancePerSession(540, 45), 12);
  });

  it("returns null when no sessions were taught", () => {
    assert.equal(calculateAverageAttendancePerSession(0, 0), null);
  });
});

describe("isRetrospectiveMetricsSession", () => {
  it("includes sessions that have already started", () => {
    assert.equal(
      isRetrospectiveMetricsSession(
        { starts_at: "2026-06-05T18:00:00.000Z" },
        "2026-06-05T18:00:00.000Z",
      ),
      true,
    );
    assert.equal(
      isRetrospectiveMetricsSession(
        { starts_at: "2026-06-05T18:00:00.000Z" },
        "2026-06-05T19:00:00.000Z",
      ),
      true,
    );
  });

  it("excludes sessions that have not started yet", () => {
    assert.equal(
      isRetrospectiveMetricsSession(
        { starts_at: "2026-06-06T18:00:00.000Z" },
        "2026-06-05T19:00:00.000Z",
      ),
      false,
    );
  });
});

describe("isNoShow", () => {
  it("does not count a no-show before the class starts", () => {
    assert.equal(
      isNoShow("booked", "not_marked", session(), "2026-06-05T17:30:00.000Z"),
      false,
    );
  });

  it("does not count a no-show while the class is running", () => {
    assert.equal(
      isNoShow("booked", "not_marked", session(), "2026-06-05T18:30:00.000Z"),
      false,
    );
  });

  it("does not count an unmarked booking immediately after class end", () => {
    assert.equal(
      isNoShow("booked", "not_marked", session(), msAfterEnd(0)),
      false,
    );
    assert.equal(
      isNoShow("booked", null, session(), msAfterEnd(30)),
      false,
    );
  });

  it("counts an unmarked booking after the register grace period", () => {
    const graceMinutes = NO_SHOW_REGISTER_GRACE_MS / 60_000;

    assert.equal(
      isNoShow("booked", "not_marked", session(), msAfterEnd(graceMinutes + 1)),
      true,
    );
    assert.equal(
      isNoShow("walk_in", null, session(), msAfterEnd(graceMinutes + 5)),
      true,
    );
  });

  it("counts explicit absent after class end without extra grace", () => {
    assert.equal(
      isNoShow("booked", "absent", session(), msAfterEnd(1)),
      true,
    );
  });

  it("never counts present attendees as no-shows", () => {
    assert.equal(
      isNoShow("booked", "present", session(), msAfterEnd(120)),
      false,
    );
  });

  it("does not count waitlisted or cancelled bookings", () => {
    const afterGrace = msAfterEnd(90);

    assert.equal(isNoShow("waitlisted", "not_marked", session(), afterGrace), false);
    assert.equal(isNoShow("cancelled", "not_marked", session(), afterGrace), false);
  });

  it("does not count no-shows for cancelled sessions", () => {
    assert.equal(
      isNoShow(
        "booked",
        "not_marked",
        session({ status: "cancelled" }),
        msAfterEnd(90),
      ),
      false,
    );
  });

  it("uses starts_at + 90 minutes when ends_at is missing", () => {
    const fallbackEnd = "2026-06-05T19:30:00.000Z";

    assert.equal(
      hasNoShowEligibilityWindowPassed(
        session({ ends_at: null }),
        "not_marked",
        fallbackEnd,
      ),
      false,
    );
    assert.equal(
      isNoShow(
        "booked",
        "not_marked",
        session({ ends_at: null }),
        "2026-06-05T20:31:00.000Z",
      ),
      true,
    );
  });
});

describe("resolveNoShowTrackingStatus", () => {
  it("labels 1 no-show as single", () => {
    assert.equal(resolveNoShowTrackingStatus(1), "single");
    assert.equal(formatNoShowTrackingStatusLabel("single"), "Single no-show");
  });

  it("labels 2-3 no-shows as multiple", () => {
    assert.equal(resolveNoShowTrackingStatus(2), "multiple");
    assert.equal(resolveNoShowTrackingStatus(3), "multiple");
    assert.equal(
      formatNoShowTrackingStatusLabel("multiple"),
      "Multiple no-shows",
    );
  });

  it("labels 4+ no-shows as frequent", () => {
    assert.equal(resolveNoShowTrackingStatus(4), "frequent");
    assert.equal(resolveNoShowTrackingStatus(12), "frequent");
    assert.equal(
      formatNoShowTrackingStatusLabel("frequent"),
      "Frequent no-shows",
    );
  });
});

describe("isNoShowTrackingEligibleStudentMembership", () => {
  it("includes active and trial students", () => {
    assert.equal(
      isNoShowTrackingEligibleStudentMembership({ role: "student", status: "active" }),
      true,
    );
    assert.equal(
      isNoShowTrackingEligibleStudentMembership({ role: "student", status: "trial" }),
      true,
    );
  });

  it("excludes paused, inactive, archived, and former members", () => {
    for (const status of ["paused", "inactive", "archived", "expired"]) {
      assert.equal(
        isNoShowTrackingEligibleStudentMembership({ role: "student", status }),
        false,
        `expected ${status} to be excluded`,
      );
    }
  });

  it("excludes non-student roles", () => {
    assert.equal(
      isNoShowTrackingEligibleStudentMembership({ role: "instructor", status: "active" }),
      false,
    );
  });
});
