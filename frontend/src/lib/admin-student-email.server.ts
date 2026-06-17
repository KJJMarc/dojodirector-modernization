import "server-only";

import { normalizeStudentEmail } from "@/lib/admin-create-student.shared";
import {
  assertStudentProfileEmailNotDuplicate,
  shouldValidateStudentProfileEmail,
} from "@/lib/admin-student-email.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function findUserIdByProfileEmail(email: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify student email: ${error.message}`);
  }

  return data?.id ?? null;
}

export async function assertStudentProfileEmailAvailable(
  email: string | null | undefined,
  excludeUserId?: string | null,
) {
  if (!shouldValidateStudentProfileEmail(email)) {
    return;
  }

  const normalizedEmail = normalizeStudentEmail(email ?? "");
  const conflictingUserId = await findUserIdByProfileEmail(normalizedEmail);

  assertStudentProfileEmailNotDuplicate({
    email: normalizedEmail,
    conflictingUserId,
    currentUserId: excludeUserId,
  });
}
