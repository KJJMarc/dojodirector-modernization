"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { resolveAuthActionErrorMessage } from "@/components/auth/handle-auth-action-error";
import { PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE } from "@/lib/portal-auth-errors.shared";
import { PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE } from "@/lib/password-reset.shared";

interface ForgotPasswordFormProps {
  loginPath: string;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

export function ForgotPasswordForm({ loginPath }: ForgotPasswordFormProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form
        className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          setSuccessMessage(null);
          setErrorMessage(null);
          const formData = new FormData(event.currentTarget);

          startTransition(async () => {
            try {
              const result = await requestPasswordResetAction(formData);
              setSuccessMessage(result.message);
            } catch (error) {
              setErrorMessage(
                resolveAuthActionErrorMessage(error) ||
                  PORTAL_AUTH_UNEXPECTED_ERROR_MESSAGE,
              );
            }
          });
        }}
      >
        <div className="space-y-2">
          <label
            htmlFor="forgot-password-email"
            className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
          >
            Email
          </label>
          <input
            id="forgot-password-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClassName}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-dojo-red px-6 py-3 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {errorMessage ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
          role="status"
        >
          {successMessage || PASSWORD_RESET_REQUEST_SUCCESS_MESSAGE}
        </p>
      ) : null}

      <p className="text-center text-sm text-dojo-muted">
        <Link href={loginPath} className="font-medium text-dojo-white hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
