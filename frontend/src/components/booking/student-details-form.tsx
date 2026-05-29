"use client";

import { RefObject } from "react";

interface StudentDetailsFormProps {
  formRef: RefObject<HTMLFormElement>;
}

export function StudentDetailsForm({ formRef }: StudentDetailsFormProps) {
  return (
    <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
        Your details
      </h2>
      <p className="mt-1 text-xs text-dojo-muted">
        Member bookings only. Guest bookings coming soon.
      </p>
      <form
        ref={formRef}
        id="student-booking-details"
        className="mt-3 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="block space-y-1">
          <span className="text-xs font-medium text-dojo-muted">First name</span>
          <input
            type="text"
            name="firstName"
            autoComplete="given-name"
            required
            className="min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-dojo-muted">Last name</span>
          <input
            type="text"
            name="lastName"
            autoComplete="family-name"
            required
            className="min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-dojo-muted">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
          />
        </label>
      </form>
    </section>
  );
}
