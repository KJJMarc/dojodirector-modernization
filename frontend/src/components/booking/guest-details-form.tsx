"use client";

import { RefObject } from "react";
import type { GuestBookingFieldErrors } from "@/lib/guest-booking-form";

interface GuestDetailsFormProps {
  formRef: RefObject<HTMLFormElement>;
  fieldErrors?: GuestBookingFieldErrors;
  visuallyHidden?: boolean;
}

const inputClassName =
  "min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2";

const errorInputClassName =
  "min-h-[40px] w-full rounded-md border border-dojo-red/60 bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-dojo-red/40 focus:ring-2";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-dojo-red">{message}</p>;
}

export function GuestDetailsForm({
  formRef,
  fieldErrors = {},
  visuallyHidden = false,
}: GuestDetailsFormProps) {
  return (
    <section
      className={`rounded-xl border border-dojo-border bg-dojo-surface p-4 ${visuallyHidden ? "sr-only" : ""}`}
      aria-hidden={visuallyHidden}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
        Your details
      </h2>
      <p className="mt-1 text-xs text-dojo-muted">
        Enter your contact details, then choose a class below.
      </p>
      <form
        ref={formRef}
        id="guest-booking-details"
        className="mt-3 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="block space-y-1">
          <span className="text-xs font-medium text-dojo-muted">First name</span>
          <input
            type="text"
            name="firstName"
            autoComplete="given-name"
            className={fieldErrors.firstName ? errorInputClassName : inputClassName}
            aria-invalid={Boolean(fieldErrors.firstName)}
            aria-describedby={fieldErrors.firstName ? "guest-firstName-error" : undefined}
          />
          <FieldError message={fieldErrors.firstName} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-dojo-muted">Last name</span>
          <input
            type="text"
            name="lastName"
            autoComplete="family-name"
            className={fieldErrors.lastName ? errorInputClassName : inputClassName}
            aria-invalid={Boolean(fieldErrors.lastName)}
          />
          <FieldError message={fieldErrors.lastName} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-dojo-muted">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className={fieldErrors.email ? errorInputClassName : inputClassName}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          <FieldError message={fieldErrors.email} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-dojo-muted">Phone (optional)</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            className={inputClassName}
          />
        </label>
      </form>
    </section>
  );
}
