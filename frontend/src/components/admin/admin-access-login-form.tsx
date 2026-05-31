"use client";

import { useState, useTransition } from "react";
import { signInAdminAccessAction } from "@/app/admin-access/[clubSlug]/actions";

interface AdminAccessLoginFormProps {
  clubSlug: string;
}

export function AdminAccessLoginForm({ clubSlug }: AdminAccessLoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);
        formData.set("clubSlug", clubSlug);

        startTransition(async () => {
          try {
            await signInAdminAccessAction(formData);
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : "Unable to sign in.",
            );
          }
        });
      }}
    >
      <input type="hidden" name="clubSlug" value={clubSlug} />

      <div className="space-y-2">
        <label
          htmlFor="admin-access-email"
          className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
        >
          Email
        </label>
        <input
          id="admin-access-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="admin-access-password"
          className="text-xs font-semibold uppercase tracking-wide text-dojo-muted"
        >
          Password
        </label>
        <input
          id="admin-access-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30"
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
        Sign in
      </button>
    </form>
  );
}
