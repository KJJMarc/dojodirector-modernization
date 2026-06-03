import "server-only";

import {
  RESEND_API_KEY_ENV,
  RESEND_ENV_FILE_HINT,
  RESEND_FROM_EMAIL_ENV,
  validateResendEnvSnapshot,
  type ResendEnvConfig,
  type ResendEnvSnapshot,
} from "@/lib/resend-env.shared";

function readEnvValue(name: string): string | null {
  const value = process.env[name]?.trim();

  return value || null;
}

/** Read Resend env vars from the server process (no secrets logged). */
export function readResendEnvSnapshot(): ResendEnvSnapshot {
  const apiKey = readEnvValue(RESEND_API_KEY_ENV);
  const fromEmail = readEnvValue(RESEND_FROM_EMAIL_ENV);

  return {
    apiKey,
    fromEmail,
    isConfigured: Boolean(apiKey && fromEmail),
  };
}

/** Returns Resend config when both vars are set; otherwise null. */
export function getResendEnvConfig(): ResendEnvConfig | null {
  const snapshot = readResendEnvSnapshot();
  const validation = validateResendEnvSnapshot(snapshot);

  if (!validation.valid || !snapshot.apiKey || !snapshot.fromEmail) {
    return null;
  }

  return {
    apiKey: snapshot.apiKey,
    fromEmail: snapshot.fromEmail,
  };
}

/** Throws when Resend env is incomplete (use before sending email). */
export function requireResendEnvConfig(): ResendEnvConfig {
  const snapshot = readResendEnvSnapshot();
  const validation = validateResendEnvSnapshot(snapshot);

  if (!validation.valid) {
    throw new Error(
      `Resend is not configured: set ${validation.missing.join(" and ")} in ${RESEND_ENV_FILE_HINT} (server-only, never NEXT_PUBLIC_).`,
    );
  }

  return {
    apiKey: snapshot.apiKey!,
    fromEmail: snapshot.fromEmail!,
  };
}
