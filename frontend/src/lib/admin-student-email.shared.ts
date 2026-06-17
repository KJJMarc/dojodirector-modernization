import { normalizeStudentEmail } from "@/lib/admin-create-student.shared";
import type { AdminStudentFormAlertContent } from "@/lib/admin-student-form.shared";

export const STUDENT_EMAIL_ALREADY_IN_USE_TITLE =
  "Student account already exists";

/** Single-line fallback for logs and non-form surfaces. */
export const STUDENT_EMAIL_ALREADY_IN_USE_MESSAGE =
  "The email address entered is already being used by another student. Please use a different email address or update the existing student record instead.";

export const STUDENT_EMAIL_ALREADY_IN_USE_ALERT: AdminStudentFormAlertContent =
  {
    title: STUDENT_EMAIL_ALREADY_IN_USE_TITLE,
    paragraphs: [
      "The email address entered is already being used by another student.",
      "To avoid login and portal access conflicts, each student must have their own unique email address.",
      "Please use a different email address or update the existing student record instead.",
    ],
    highlightEmailField: true,
  };

export class StudentEmailAlreadyInUseError extends Error {
  constructor(message: string = STUDENT_EMAIL_ALREADY_IN_USE_MESSAGE) {
    super(message);
    this.name = "StudentEmailAlreadyInUseError";
  }
}

export function shouldValidateStudentProfileEmail(
  email: string | null | undefined,
): boolean {
  const normalized = normalizeStudentEmail(email ?? "");
  return normalized.includes("@");
}

export function getStudentProfileEmailDuplicateStatus(input: {
  email: string | null | undefined;
  conflictingUserId: string | null | undefined;
  currentUserId?: string | null;
}): "available" | "duplicate" {
  if (!shouldValidateStudentProfileEmail(input.email)) {
    return "available";
  }

  if (!input.conflictingUserId) {
    return "available";
  }

  if (input.currentUserId && input.conflictingUserId === input.currentUserId) {
    return "available";
  }

  return "duplicate";
}

export function assertStudentProfileEmailNotDuplicate(input: {
  email: string | null | undefined;
  conflictingUserId: string | null | undefined;
  currentUserId?: string | null;
}) {
  if (getStudentProfileEmailDuplicateStatus(input) === "duplicate") {
    throw new StudentEmailAlreadyInUseError();
  }
}
