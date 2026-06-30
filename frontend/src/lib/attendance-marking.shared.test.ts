import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatAttendanceMarkDevMessage,
  isSupabaseDuplicateKeyError,
} from "@/lib/attendance-marking.shared";

test("formatAttendanceMarkDevMessage includes phase and supabase details", () => {
  const message = formatAttendanceMarkDevMessage({
    phase: "updateSessionAttendee",
    outcome: "permission_denied",
    supabaseError: {
      code: "42501",
      message: "permission denied for table session_attendees",
    },
  });

  assert.match(message, /updateSessionAttendee/);
  assert.match(message, /42501/);
  assert.match(message, /permission denied/);
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
