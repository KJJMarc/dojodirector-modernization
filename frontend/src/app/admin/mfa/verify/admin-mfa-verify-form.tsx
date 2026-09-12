"use client";

import { useState, useTransition } from "react";
import { resolveAuthActionErrorMessage } from "@/components/auth/handle-auth-action-error";
import { ADMIN_MFA_REQUIRED_MESSAGE } from "@/lib/admin-mfa.shared";
import { verifyAdminMfaChallengeAction } from "./actions";

interface AdminMfaVerifyFormProps {
  next: string;
}

export function AdminMfaVerifyForm({ next }: AdminMfaVerifyFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            await verifyAdminMfaChallengeAction(formData);
          } catch (error) {
            setErrorMessage(resolveAuthActionErrorMessage(error));
          }
        });
      }}
    >
      <input type="hidden" name="next" value={next} />

      <p className="text-sm text-dojo-muted">{ADMIN_MFA_REQUIRED_MESSAGE}</p>

      <div className="space-y-2">
        <label
          htmlFor="admin-mfa-code"
          className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
        >
          Authenticator code
        </label>
        <input
          id="admin-mfa-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,8}"
          maxLength={8}
          required
          autoFocus
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-center text-lg tracking-[0.3em] text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30"
          placeholder="000000"
        />
      </div>

      {errorMessage ? (
        <p
          className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-dojo-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-dojo-red/90 disabled:opacity-60"
      >
        {isPending ? "Verifying…" : "Verify and continue"}
      </button>
    </form>
  );
}
