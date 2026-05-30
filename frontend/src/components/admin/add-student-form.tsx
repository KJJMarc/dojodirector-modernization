"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createAdminStudentAction } from "@/app/admin/students/new/actions";
import {
  MEMBERSHIP_ROLE_OPTIONS,
  MEMBERSHIP_STATUS_OPTIONS,
} from "@/lib/admin-create-student.shared";

export function AddStudentForm() {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fieldClassName =
    "mt-1 w-full rounded-md border border-dojo-border bg-dojo-black px-3 py-2 text-sm text-dojo-white outline-none focus:border-dojo-red";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await createAdminStudentAction(formData);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to add student.",
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        <label htmlFor="dateOfBirth" className="text-sm font-medium text-dojo-white">
          Date of birth
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium text-dojo-white">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className={fieldClassName}
          placeholder="Optional admin notes"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="role" className="text-sm font-medium text-dojo-white">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="student"
            className={fieldClassName}
          >
            {MEMBERSHIP_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="membershipStatus"
            className="text-sm font-medium text-dojo-white"
          >
            Membership status
          </label>
          <select
            id="membershipStatus"
            name="membershipStatus"
            defaultValue="active"
            className={fieldClassName}
          >
            {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add student"}
        </button>
        <Link
          href="/admin/students"
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
