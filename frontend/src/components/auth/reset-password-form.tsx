"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  updatePasswordAfterResetAction,
  updatePasswordAfterSetupAction,
} from "@/app/reset-password/actions";
import { PORTAL_SETUP_INVALID_LINK_MESSAGE } from "@/lib/portal-setup.shared";
import {
  forgotPasswordPath,
  PASSWORD_RESET_INVALID_LINK_MESSAGE,
  type PasswordResetLoginContext,
} from "@/lib/password-reset.shared";

interface ResetPasswordFormProps {
  loginPath: string;
  context: PasswordResetLoginContext | null;
  isFirstTimeSetup?: boolean;
  hasRecoverySession: boolean;
  showInvalidLink: boolean;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

export function ResetPasswordForm({
  loginPath,
  context,
  isFirstTimeSetup = false,
  hasRecoverySession,
  showInvalidLink,
}: ResetPasswordFormProps) {
  const invalidLinkMessage = isFirstTimeSetup
    ? PORTAL_SETUP_INVALID_LINK_MESSAGE
    : PASSWORD_RESET_INVALID_LINK_MESSAGE;
  const [errorMessage, setErrorMessage] = useState<string | null>(
    showInvalidLink ? invalidLinkMessage : null,
  );
  const [isPending, startTransition] = useTransition();

  if (!hasRecoverySession) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {errorMessage ?? invalidLinkMessage}
        </p>
        <p className="text-center text-sm text-dojo-muted">
          <Link
            href={forgotPasswordPath(context ?? "student")}
            className="font-medium text-dojo-white hover:underline"
          >
            {isFirstTimeSetup ? "Request a password reset link" : "Request a new reset link"}
          </Link>
        </p>
        <p className="text-center text-sm text-dojo-muted">
          <Link href={loginPath} className="font-medium text-dojo-white hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        const formData = new FormData(event.currentTarget);

        if (context) {
          formData.set("context", context);
        }

        if (isFirstTimeSetup) {
          formData.set("setup", "1");
        }

        startTransition(async () => {
          try {
            const action = isFirstTimeSetup
              ? updatePasswordAfterSetupAction
              : updatePasswordAfterResetAction;
            await action(formData);
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : PASSWORD_RESET_INVALID_LINK_MESSAGE,
            );
          }
        });
      }}
    >
      {context ? <input type="hidden" name="context" value={context} /> : null}
      {isFirstTimeSetup ? <input type="hidden" name="setup" value="1" /> : null}

      <div className="space-y-2">
        <label
          htmlFor="reset-password"
          className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
        >
          {isFirstTimeSetup ? "Password" : "New password"}
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="reset-password-confirm"
          className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
        >
          Confirm password
        </label>
        <input
          id="reset-password-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName}
        />
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-dojo-red px-6 py-3 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Saving…"
          : isFirstTimeSetup
            ? "Save password"
            : "Update password"}
      </button>

      <p className="text-center text-sm text-dojo-muted">
        <Link href={loginPath} className="font-medium text-dojo-white hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
