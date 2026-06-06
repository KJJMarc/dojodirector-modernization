import "server-only";

import { isRedirectError } from "next/dist/client/components/redirect";
import { mapPortalAuthError } from "@/lib/portal-auth-errors.shared";

export function logPortalAuthError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>,
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("[portal-auth-error]", {
    context,
    message,
    stack,
    ...metadata,
  });
}

export function throwPortalAuthError(context: string, error: unknown): never {
  if (isRedirectError(error)) {
    throw error;
  }

  logPortalAuthError(context, error);
  throw new Error(mapPortalAuthError(error));
}
