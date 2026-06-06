"use client";

import { useState, useTransition } from "react";
import { clubTrialEnquiryApiPath } from "@/lib/clubs.shared";
import {
  LEAD_EXPERIENCE_LEVELS,
  TRIAL_AUDIENCES,
  TRIAL_ENQUIRY_PROGRAMME_INTERESTS,
  formatLeadExperienceLevelLabel,
  formatLeadProgrammeInterestLabel,
  formatTrialAudienceLabel,
  type LeadSubmissionResult,
} from "@/lib/leads.shared";

function formatTrialEnquirySubmitError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (
      message === "Load failed" ||
      message === "Failed to fetch" ||
      message === "NetworkError when attempting to fetch resource."
    ) {
      return "We could not reach the server. Please check your connection and try again.";
    }

    if (message.includes("Server Components render")) {
      return "Something went wrong submitting your enquiry. Please try again in a moment.";
    }

    return message || "Unable to submit your enquiry.";
  }

  return "Unable to submit your enquiry.";
}

async function submitTrialEnquiry(
  clubSlug: string,
  formData: FormData,
): Promise<LeadSubmissionResult> {
  const response = await fetch(clubTrialEnquiryApiPath(clubSlug), {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  let payload: LeadSubmissionResult | { error?: string } | null = null;

  try {
    payload = (await response.json()) as LeadSubmissionResult | { error?: string };
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && "error" in payload && payload.error
        ? payload.error
        : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  if (!payload || !("ok" in payload) || !payload.ok) {
    throw new Error("Unable to submit your enquiry.");
  }

  return payload;
}

interface TrialEnquiryFormProps {
  clubSlug: string;
}

const inputClassName =
  "min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2";

const labelClassName = "text-xs font-medium text-dojo-muted";

const audienceCardClassName =
  "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border border-dojo-border bg-dojo-black px-4 py-3 text-sm font-medium text-dojo-white transition has-[:checked]:border-dojo-red/70 has-[:checked]:bg-dojo-red/10";

export function TrialEnquiryForm({ clubSlug }: TrialEnquiryFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isSubmitted) {
    return (
      <section
        className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5"
        role="status"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-dojo-white">Thank you for your enquiry.</h2>
          <p className="text-sm text-dojo-muted">
            We&apos;ll be in touch shortly about your free trial.
          </p>
        </div>
      </section>
    );
  }

  return (
    <form
      className={`space-y-5 rounded-xl border border-dojo-border bg-dojo-surface p-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            await submitTrialEnquiry(clubSlug, formData);
            setIsSubmitted(true);
          } catch (error) {
            setErrorMessage(formatTrialEnquirySubmitError(error));
          }
        });
      }}
    >
      <fieldset className="space-y-3 rounded-xl border-2 border-dojo-red/40 bg-dojo-elevated p-4">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Who is the trial for?
        </legend>
        <p className="text-xs text-dojo-muted">Choose who the trial is for.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TRIAL_AUDIENCES.map((value) => (
            <label key={value} className={audienceCardClassName}>
              <input
                type="radio"
                name="trialAudience"
                value={value}
                required
                className="h-5 w-5 shrink-0 border-dojo-border text-dojo-red focus:ring-dojo-red/30"
              />
              {formatTrialAudienceLabel(value)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className={labelClassName}>Name</span>
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
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            className={inputClassName}
          />
        </label>

        <label className="block space-y-1">
          <span className={labelClassName}>Programme interest</span>
          <select name="programmeInterest" required className={inputClassName} defaultValue="">
            <option value="" disabled>
              Select a programme
            </option>
            {TRIAL_ENQUIRY_PROGRAMME_INTERESTS.map((value) => (
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
          <span className={labelClassName}>Additional information (optional)</span>
          <textarea
            name="notes"
            rows={3}
            className={`${inputClassName} min-h-[72px] py-2`}
            placeholder="Anything useful about your goals, experience or availability."
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

      <p className="text-center text-xs text-dojo-muted">We normally respond within 24 hours.</p>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed sm:w-auto"
      >
        {isPending ? "Sending…" : "Request Free Trial"}
      </button>
    </form>
  );
}
