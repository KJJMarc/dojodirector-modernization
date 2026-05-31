"use client";

import { useState, useTransition } from "react";
import { setInstructorPortalPasswordAction } from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";

interface InstructorPortalSetPasswordFormProps {
  clubSlug: string;
  userId: string;
  canSetPassword: boolean;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wide text-dojo-muted";

export function InstructorPortalSetPasswordForm({
  clubSlug,
  userId,
  canSetPassword,
}: InstructorPortalSetPasswordFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canSetPassword) {
    return (
      <p className="text-sm text-dojo-muted">
        No instructor portal login has been created. Save an instructor portal login
        email above before setting a password.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setSuccessMessage(null);
            setErrorMessage(null);
          }}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
        >
          Set instructor portal password
        </button>
      ) : (
        <form
          className={`space-y-3 ${isPending ? "pointer-events-none opacity-60" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            setSuccessMessage(null);
            setErrorMessage(null);

            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              try {
                const result = await setInstructorPortalPasswordAction(
                  clubSlug,
                  userId,
                  formData,
                );
                setSuccessMessage(result.message);
                setShowForm(false);
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to update instructor portal password.",
                );
              }
            });
          }}
        >
          <div className="space-y-2">
            <label htmlFor="instructor-portal-new-password" className={labelClassName}>
              New password
            </label>
            <input
              id="instructor-portal-new-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="instructor-portal-confirm-password" className={labelClassName}>
              Confirm password
            </label>
            <input
              id="instructor-portal-confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save password
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowForm(false);
                setErrorMessage(null);
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {successMessage ? (
        <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white">
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
