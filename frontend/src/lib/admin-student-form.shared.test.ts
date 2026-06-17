import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StudentAlreadyExistsError } from "./admin-create-student.shared.ts";
import {
  mapAdminStudentSaveError,
  mapAdminStudentSaveFailure,
  STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT,
  toAdminStudentSaveFailureState,
} from "./admin-student-form.shared.ts";
import {
  STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
  StudentEmailAlreadyInUseError,
} from "./admin-student-email.shared.ts";

describe("mapAdminStudentSaveFailure", () => {
  it("maps duplicate email failures to the friendly admin alert", () => {
    assert.deepEqual(
      mapAdminStudentSaveFailure({ code: "duplicate_email" }),
      STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
    );
  });

  it("maps same-academy student failures to a dedicated alert", () => {
    assert.deepEqual(
      mapAdminStudentSaveFailure({ code: "already_exists_at_academy" }),
      STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT,
    );
  });

  it("maps validation failures to a generic save alert", () => {
    const alert = mapAdminStudentSaveFailure({
      code: "validation",
      message: "Select at least one programme student area.",
    });

    assert.equal(alert.title, "Unable to save student");
    assert.deepEqual(alert.paragraphs, [
      "Select at least one programme student area.",
    ]);
  });
});

describe("mapAdminStudentSaveError", () => {
  it("maps duplicate email errors to the friendly admin alert", () => {
    assert.deepEqual(
      mapAdminStudentSaveError(new StudentEmailAlreadyInUseError()),
      STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
    );
  });

  it("maps same-academy student errors to a dedicated alert", () => {
    assert.deepEqual(
      mapAdminStudentSaveError(new StudentAlreadyExistsError()),
      STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT,
    );
  });

  it("maps unknown errors to a generic save alert", () => {
    const alert = mapAdminStudentSaveError(new Error("Database unavailable."));

    assert.equal(alert.title, "Unable to save student");
    assert.deepEqual(alert.paragraphs, ["Database unavailable."]);
  });
});

describe("toAdminStudentSaveFailureState", () => {
  it("wraps failure alerts in action state", () => {
    assert.deepEqual(
      toAdminStudentSaveFailureState({ code: "duplicate_email" }),
      {
        ok: false,
        alert: STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
      },
    );
  });
});
