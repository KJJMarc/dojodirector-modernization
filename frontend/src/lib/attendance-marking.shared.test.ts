import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatAttendanceMarkDevMessage,
  isAttendanceRecordSyncFailureFatal,
  isSupabaseDuplicateKeyError,
  shouldExposeAttendanceMarkDevDetails,
} from "@/lib/attendance-marking.shared";

test("formatAttendanceMarkDevMessage includes phase, ids, and supabase details", () => {
  const message = formatAttendanceMarkDevMessage({
    phase: "updateSessionAttendee",
    outcome: "permission_denied",
    attendeeId: "att-1",
    userId: "user-1",
    sessionId: "session-1",
    supabaseError: {
      code: "42501",
      message: "permission denied for table session_attendees",
    },
  });

  assert.match(message, /updateSessionAttendee/);
  assert.match(message, /att-1/);
  assert.match(message, /user-1/);
  assert.match(message, /42501/);
  assert.match(message, /permission denied/);
});

test("isAttendanceRecordSyncFailureFatal is false when register row was updated", () => {
  assert.equal(
    isAttendanceRecordSyncFailureFatal({
      registerUpdated: true,
      alreadyMarked: false,
    }),
    false,
  );
});

test("isAttendanceRecordSyncFailureFatal is false when status was already marked", () => {
  assert.equal(
    isAttendanceRecordSyncFailureFatal({
      registerUpdated: false,
      alreadyMarked: true,
    }),
    false,
  );
});

test("shouldExposeAttendanceMarkDevDetails in development", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalDebug = process.env.ATTENDANCE_MARKING_DEBUG;

  try {
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    delete process.env.ATTENDANCE_MARKING_DEBUG;
    assert.equal(shouldExposeAttendanceMarkDevDetails(), true);

    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    assert.equal(shouldExposeAttendanceMarkDevDetails(), true);

    process.env.VERCEL_ENV = "production";
    process.env.ATTENDANCE_MARKING_DEBUG = "1";
    assert.equal(shouldExposeAttendanceMarkDevDetails(), true);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
    if (originalDebug === undefined) {
      delete process.env.ATTENDANCE_MARKING_DEBUG;
    } else {
      process.env.ATTENDANCE_MARKING_DEBUG = originalDebug;
    }
  }
});

test("isSupabaseDuplicateKeyError detects postgres unique violations", () => {
  assert.equal(isSupabaseDuplicateKeyError({ code: "23505" }), true);
  assert.equal(
    isSupabaseDuplicateKeyError({
      message: 'duplicate key value violates unique constraint "attendance_records_user_id_club_id_attended_on_class_session_id_key"',
    }),
    true,
  );
  assert.equal(isSupabaseDuplicateKeyError({ code: "42501" }), false);
});
