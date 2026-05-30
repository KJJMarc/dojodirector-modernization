"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createAdminInstructorAction } from "@/app/admin/[clubSlug]/instructors/new/actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import { INSTRUCTOR_CREATE_ROLE_OPTIONS } from "@/lib/admin-instructors.shared";

export function AddInstructorForm({ clubSlug }: { clubSlug: string }) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [promoteExistingMember, setPromoteExistingMember] = useState(false);

  const fieldClassName =
    "mt-1 w-full rounded-md border border-dojo-border bg-dojo-black px-3 py-2 text-sm text-dojo-white outline-none focus:border-dojo-red";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set(
      "promoteExistingMember",
      promoteExistingMember ? "true" : "false",
    );

    startTransition(async () => {
      try {
        await createAdminInstructorAction(formData);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to add instructor.",
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="clubSlug" value={clubSlug} />
      {errorMessage ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="text-sm font-medium text-dojo-white">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            className={fieldClassName}
          />
        </div>

        <div>
          <label htmlFor="lastName" className="text-sm font-medium text-dojo-white">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            className={fieldClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-dojo-white">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium text-dojo-white">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="role" className="text-sm font-medium text-dojo-white">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="instructor"
          className={fieldClassName}
        >
          {INSTRUCTOR_CREATE_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2 text-sm text-dojo-muted">
        <input
          type="checkbox"
          checked={promoteExistingMember}
          onChange={(event) => setPromoteExistingMember(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-dojo-border"
        />
        <span>
          Promote existing member to instructor if this email already belongs to
          someone with a student membership.
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add instructor"}
        </button>
        <Link
          href={clubAdminPath(clubSlug, "instructors")}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
