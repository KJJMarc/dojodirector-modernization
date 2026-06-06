"use client";

import { isRedirectError } from "next/dist/client/components/redirect";
import { mapPortalAuthError } from "@/lib/portal-auth-errors.shared";

/** Re-throws Next.js redirects; otherwise returns a safe user-facing auth message. */
export function resolveAuthActionErrorMessage(error: unknown): string {
  if (isRedirectError(error)) {
    throw error;
  }

  return mapPortalAuthError(error);
}
