import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
  STUDENT_EMAIL_ALREADY_IN_USE_MESSAGE,
  StudentEmailAlreadyInUseError,
  assertStudentProfileEmailNotDuplicate,
  getStudentProfileEmailDuplicateStatus,
  shouldValidateStudentProfileEmail,
} from "./admin-student-email.shared.ts";

describe("shouldValidateStudentProfileEmail", () => {
  it("skips blank and whitespace-only values", () => {
    assert.equal(shouldValidateStudentProfileEmail(""), false);
    assert.equal(shouldValidateStudentProfileEmail("   "), false);
    assert.equal(shouldValidateStudentProfileEmail(null), false);
    assert.equal(shouldValidateStudentProfileEmail(undefined), false);
  });

  it("validates trimmed, case-insensitive emails", () => {
    assert.equal(shouldValidateStudentProfileEmail("  Student@Example.com "), true);
  });
});

describe("getStudentProfileEmailDuplicateStatus", () => {
  it("returns duplicate for another student's email", () => {
    assert.equal(
      getStudentProfileEmailDuplicateStatus({
        email: "student@example.com",
        conflictingUserId: "user-2",
        currentUserId: "user-1",
      }),
      "duplicate",
    );
  });

  it("returns available for the same student", () => {
    assert.equal(
      getStudentProfileEmailDuplicateStatus({
        email: "student@example.com",
        conflictingUserId: "user-1",
        currentUserId: "user-1",
      }),
      "available",
    );
  });
});

describe("assertStudentProfileEmailNotDuplicate", () => {
  it("allows blank emails", () => {
    assert.doesNotThrow(() =>
      assertStudentProfileEmailNotDuplicate({
        email: "",
        conflictingUserId: "other-user",
      }),
    );
  });

  it("allows the same student to keep their email", () => {
    assert.doesNotThrow(() =>
      assertStudentProfileEmailNotDuplicate({
        email: "student@example.com",
        conflictingUserId: "user-1",
        currentUserId: "user-1",
      }),
    );
  });

  it("blocks another student from using the same email", () => {
    assert.throws(
      () =>
        assertStudentProfileEmailNotDuplicate({
          email: "student@example.com",
          conflictingUserId: "user-2",
          currentUserId: "user-1",
        }),
      (error: unknown) => {
        assert.ok(error instanceof StudentEmailAlreadyInUseError);
        assert.equal(error.message, STUDENT_EMAIL_ALREADY_IN_USE_MESSAGE);
        assert.equal(
          STUDENT_EMAIL_ALREADY_IN_USE_ALERT.title,
          "Student account already exists",
        );
        return true;
      },
    );
  });

  it("compares emails case-insensitively after normalization", () => {
    assert.throws(
      () =>
        assertStudentProfileEmailNotDuplicate({
          email: "  Student@Example.com ",
          conflictingUserId: "user-2",
        }),
      (error: unknown) => error instanceof StudentEmailAlreadyInUseError,
    );
  });
});
