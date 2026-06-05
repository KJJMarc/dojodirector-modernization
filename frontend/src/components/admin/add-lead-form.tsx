"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLeadAction } from "@/app/admin/[clubSlug]/leads/actions";
import {
  LEAD_EXPERIENCE_LEVELS,
  LEAD_PROGRAMME_INTERESTS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  clubLeadDetailAdminPath,
  clubLeadsAdminPath,
  formatLeadExperienceLevelLabel,
  formatLeadProgrammeInterestLabel,
  formatLeadSourceLabel,
  formatLeadStatusLabel,
} from "@/lib/leads.shared";

interface AddLeadFormProps {
  clubSlug: string;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

export function AddLeadForm({ clubSlug }: AddLeadFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={`space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            const result = await createLeadAction(clubSlug, formData);
            router.push(clubLeadDetailAdminPath(clubSlug, result.leadId));
            router.refresh();
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : "Unable to create lead.",
            );
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className={labelClassName}>Full name</span>
          <input
            type="text"
            name="fullName"
            required
            autoComplete="name"
            className={inputClassName}
          />
        </label>

        <label className="block space-y-1">
          <span className={labelClassName}>Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className={inputClassName}
          />
        </label>

        <label className="block space-y-1">
          <span className={labelClassName}>Phone</span>
          <input type="tel" name="phone" autoComplete="tel" className={inputClassName} />
        </label>

        <label className="block space-y-1">
          <span className={labelClassName}>Programme interest</span>
          <select name="programmeInterest" required className={inputClassName} defaultValue="">
            <option value="" disabled>
              Select a programme
            </option>
            {LEAD_PROGRAMME_INTERESTS.map((value) => (
              <option key={value} value={value}>
                {formatLeadProgrammeInterestLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className={labelClassName}>Experience level</span>
          <select name="experienceLevel" required className={inputClassName} defaultValue="">
            <option value="" disabled>
              Select experience level
            </option>
            {LEAD_EXPERIENCE_LEVELS.map((value) => (
              <option key={value} value={value}>
                {formatLeadExperienceLevelLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className={labelClassName}>Lead source</span>
          <select name="leadSource" className={inputClassName} defaultValue="phone">
            {LEAD_SOURCES.map((value) => (
              <option key={value} value={value}>
                {formatLeadSourceLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className={labelClassName}>Status</span>
          <select name="status" className={inputClassName} defaultValue="new">
            {LEAD_STATUSES.map((value) => (
              <option key={value} value={value}>
                {formatLeadStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className={labelClassName}>Notes</span>
          <textarea
            name="notes"
            rows={4}
            className={`${inputClassName} min-h-[96px]`}
            placeholder="Optional notes from the enquiry."
          />
        </label>
      </div>

      {errorMessage ? (
        <p
          className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : "Create lead"}
        </button>
        <Link
          href={clubLeadsAdminPath(clubSlug)}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
