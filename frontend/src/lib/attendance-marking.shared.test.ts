import assert from "node:assert/strict";
import { test } from "node:test";
import { isSupabaseDuplicateKeyError } from "@/lib/attendance-marking.shared";

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
