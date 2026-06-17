import {
  STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
  StudentEmailAlreadyInUseError,
} from "@/lib/admin-student-email.shared";
import { StudentAlreadyExistsError } from "@/lib/admin-create-student.shared";

export interface AdminStudentFormAlertContent {
  title: string;
  paragraphs: string[];
  highlightEmailField?: boolean;
}

export type AdminStudentSaveFailure =
  | { code: "duplicate_email" }
  | { code: "already_exists_at_academy" }
  | { code: "validation"; message: string };

export type AdminStudentSaveActionState =
  | { ok: true }
  | { ok: false; alert: AdminStudentFormAlertContent };

export const ADMIN_STUDENT_FORM_INITIAL_STATE: AdminStudentSaveActionState | null =
  null;

export const STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT: AdminStudentFormAlertContent =
  {
    title: "Student already exists",
    paragraphs: [
      "This student already has a membership at this academy.",
      "Open their existing profile to make changes instead of creating a new record.",
    ],
  };

export const GENERIC_ADMIN_STUDENT_SAVE_ERROR_TITLE = "Unable to save student";

export function mapAdminStudentSaveFailure(
  failure: AdminStudentSaveFailure,
): AdminStudentFormAlertContent {
  switch (failure.code) {
    case "duplicate_email":
      return STUDENT_EMAIL_ALREADY_IN_USE_ALERT;
    case "already_exists_at_academy":
      return STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT;
    case "validation":
      return {
        title: GENERIC_ADMIN_STUDENT_SAVE_ERROR_TITLE,
        paragraphs: [failure.message],
      };
  }
}

function isStudentEmailAlreadyInUseError(error: unknown) {
  return (
    error instanceof StudentEmailAlreadyInUseError ||
    (error instanceof Error && error.name === "StudentEmailAlreadyInUseError")
  );
}

function isStudentAlreadyExistsError(error: unknown) {
  return (
    error instanceof StudentAlreadyExistsError ||
    (error instanceof Error && error.name === "StudentAlreadyExistsError")
  );
}

export function mapAdminStudentSaveError(
  error: unknown,
): AdminStudentFormAlertContent {
  if (isStudentEmailAlreadyInUseError(error)) {
    return STUDENT_EMAIL_ALREADY_IN_USE_ALERT;
  }

  if (isStudentAlreadyExistsError(error)) {
    return STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT;
  }

  const message =
    error instanceof Error ? error.message : "Please try again in a moment.";

  return {
    title: GENERIC_ADMIN_STUDENT_SAVE_ERROR_TITLE,
    paragraphs: [message],
  };
}

export function toAdminStudentSaveFailureState(
  failure: AdminStudentSaveFailure,
): AdminStudentSaveActionState {
  return {
    ok: false,
    alert: mapAdminStudentSaveFailure(failure),
  };
}

export function toAdminStudentSaveErrorState(
  error: unknown,
): AdminStudentSaveActionState {
  return {
    ok: false,
    alert: mapAdminStudentSaveError(error),
  };
}
