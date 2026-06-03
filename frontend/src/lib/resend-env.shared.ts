export const RESEND_API_KEY_ENV = "RESEND_API_KEY" as const;
export const RESEND_FROM_EMAIL_ENV = "RESEND_FROM_EMAIL" as const;

export const RESEND_ENV_FILE_HINT = "frontend/.env.local";

/** Resolved Resend credentials when both variables are set. */
export interface ResendEnvConfig {
  apiKey: string;
  fromEmail: string;
}

/** Non-secret snapshot of whether Resend env is present (for diagnostics). */
export interface ResendEnvSnapshot {
  apiKey: string | null;
  fromEmail: string | null;
  isConfigured: boolean;
}

export interface ResendEnvValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateResendEnvSnapshot(
  snapshot: ResendEnvSnapshot,
): ResendEnvValidationResult {
  const missing: string[] = [];

  if (!snapshot.apiKey) {
    missing.push(RESEND_API_KEY_ENV);
  }

  if (!snapshot.fromEmail) {
    missing.push(RESEND_FROM_EMAIL_ENV);
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
