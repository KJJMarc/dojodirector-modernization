import {
  StudentEmailAlreadyInUseError,
  STUDENT_EMAIL_ALREADY_IN_USE_ALERT,
} from "@/lib/admin-student-email.shared";
import { StudentAlreadyExistsError } from "@/lib/admin-create-student.shared";

export interface AdminStudentFormAlertContent {
  title: string;
  paragraphs: string[];
  highlightEmailField?: boolean;
}

export type AdminStudentSaveActionResult =
  | { ok: true }
  | { ok: false; alert: AdminStudentFormAlertContent };

export const STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT: AdminStudentFormAlertContent =
  {
    title: "Student already exists",
    paragraphs: [
      "This student already has a membership at this academy.",
      "Open their existing profile to make changes instead of creating a new record.",
    ],
  };

export const GENERIC_ADMIN_STUDENT_SAVE_ERROR_TITLE = "Unable to save student";

export function mapAdminStudentSaveError(
  error: unknown,
): AdminStudentFormAlertContent {
  if (error instanceof StudentEmailAlreadyInUseError) {
    return STUDENT_EMAIL_ALREADY_IN_USE_ALERT;
  }

  if (error instanceof StudentAlreadyExistsError) {
    return STUDENT_ALREADY_EXISTS_AT_ACADEMY_ALERT;
  }

  const message =
    error instanceof Error ? error.message : "Please try again in a moment.";

  return {
    title: GENERIC_ADMIN_STUDENT_SAVE_ERROR_TITLE,
    paragraphs: [message],
  };
}
