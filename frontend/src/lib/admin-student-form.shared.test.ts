import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StudentAlreadyExistsError } from "./admin-create-student.shared.ts";
import {
  mapAdminStudentSaveError,
  STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT,
} from "./admin-student-form.shared.ts";
import {
  STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
  StudentEmailAlreadyInUseError,
} from "./admin-student-email.shared.ts";

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
