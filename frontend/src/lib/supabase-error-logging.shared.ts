export interface SupabaseErrorShape {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function serializeSupabaseError(
  error: SupabaseErrorShape | null | undefined,
) {
  if (!error) {
    return null;
  }

  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

export function formatSupabaseErrorMessage(
  context: string,
  error: SupabaseErrorShape | null | undefined,
): string {
  const message = error?.message?.trim();

  if (message) {
    return `${context}: ${message}`;
  }

  const details = [error?.code, error?.details, error?.hint]
    .filter(Boolean)
    .join(" — ");

  return details ? `${context}: ${details}` : context;
}

export function isSupabaseUniqueViolation(
  error: SupabaseErrorShape | null | undefined,
): boolean {
  return error?.code === "23505";
}
