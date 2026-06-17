import { normalizeStudentEmail } from "@/lib/admin-create-student.shared";

export const STUDENT_EMAIL_ALREADY_IN_USE_MESSAGE =
  "This email address is already in use by another student. Please use a different email address or update the existing student record.";

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

export function assertStudentProfileEmailNotDuplicate(input: {
  email: string | null | undefined;
  conflictingUserId: string | null | undefined;
  currentUserId?: string | null;
}) {
  if (!shouldValidateStudentProfileEmail(input.email)) {
    return;
  }

  if (!input.conflictingUserId) {
    return;
  }

  if (input.currentUserId && input.conflictingUserId === input.currentUserId) {
    return;
  }

  throw new StudentEmailAlreadyInUseError();
}
