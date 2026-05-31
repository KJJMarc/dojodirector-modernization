"use client";

import { useState, useTransition } from "react";
import {
  clearAdminAccessLoginAction,
  setAdminAccessPasswordAction,
} from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";

interface AdminAccessSetPasswordFormProps {
  clubSlug: string;
  userId: string;
  canSetPassword: boolean;
  hasAuthLogin: boolean;
  canClearAccess: boolean;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wide text-dojo-muted";

export function AdminAccessSetPasswordForm({
  clubSlug,
  userId,
  canSetPassword,
  hasAuthLogin,
  canClearAccess,
}: AdminAccessSetPasswordFormProps) {
  const openFormLabel = hasAuthLogin
    ? "Change admin password"
    : "Create admin login and set password";
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canSetPassword) {
    return (
      <p className="text-sm text-dojo-muted">
        Add a profile email before setting an admin login password.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
          >
            {openFormLabel}
          </button>
          {canClearAccess ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setSuccessMessage(null);
                setErrorMessage(null);

                startTransition(async () => {
                  try {
                    const result = await clearAdminAccessLoginAction(clubSlug, userId);
                    setSuccessMessage(result.message);
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : "Unable to clear admin login access.",
                    );
                  }
                });
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-muted transition hover:border-dojo-red/40 hover:text-dojo-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear login link
            </button>
          ) : null}
        </div>
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
                const result = await setAdminAccessPasswordAction(
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
                    : "Unable to update admin password.",
                );
              }
            });
          }}
        >
          <div className="space-y-2">
            <label htmlFor="admin-access-new-password" className={labelClassName}>
              New password
            </label>
            <input
              id="admin-access-new-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-access-confirm-password" className={labelClassName}>
              Confirm password
            </label>
            <input
              id="admin-access-confirm-password"
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
