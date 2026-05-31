"use client";

import { useState, useTransition } from "react";
import { updateInstructorPortalLoginEmailAction } from "@/app/admin/[clubSlug]/students/[userId]/profile/actions";

interface InstructorPortalLoginEmailFormProps {
  clubSlug: string;
  userId: string;
  initialLoginEmail: string | null;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wide text-dojo-muted";

export function InstructorPortalLoginEmailForm({
  clubSlug,
  userId,
  initialLoginEmail,
}: InstructorPortalLoginEmailFormProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={`space-y-3 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setSuccessMessage(null);
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            const result = await updateInstructorPortalLoginEmailAction(
              clubSlug,
              userId,
              formData,
            );
            setSuccessMessage(result.message);
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Unable to update instructor portal login email.",
            );
          }
        });
      }}
    >
      <div className="space-y-2">
        <label htmlFor="instructor-portal-login-email" className={labelClassName}>
          Instructor portal login email
        </label>
        <input
          id="instructor-portal-login-email"
          name="loginEmail"
          type="email"
          required
          defaultValue={initialLoginEmail ?? ""}
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save instructor portal login email"}
      </button>

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
    </form>
  );
}
