"use client";

import { useState, useTransition } from "react";
import {
  sendAdminEmailTestAction,
  type AdminEmailTestActionResult,
} from "@/app/admin/email-test/actions";
import type { AcademyEmailSettings } from "@/lib/academy-email.shared";

interface AdminEmailTestFormProps {
  academies: AcademyEmailSettings[];
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

export function AdminEmailTestForm({ academies }: AdminEmailTestFormProps) {
  const [result, setResult] = useState<AdminEmailTestActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  if (academies.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-6 text-sm text-dojo-muted">
        No academies with email enabled are available for your account. Apply the club
        email settings migration and confirm email is enabled for your academies.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className={`space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          startTransition(async () => {
            setResult(null);
            const actionResult = await sendAdminEmailTestAction(formData);
            setResult(actionResult);
          });
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="clubSlug" className={labelClassName}>
            Academy
          </label>
          <select
            id="clubSlug"
            name="clubSlug"
            required
            defaultValue={academies[0]?.clubSlug ?? ""}
            className={inputClassName}
          >
            {academies.map((academy) => (
              <option key={academy.clubId} value={academy.clubSlug}>
                {academy.clubName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="recipientEmail" className={labelClassName}>
            Recipient email
          </label>
          <input
            id="recipientEmail"
            name="recipientEmail"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClassName}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed"
        >
          {isPending ? "Sending…" : "Send test email"}
        </button>
      </form>

      {result?.ok ? (
        <div
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          <p className="font-semibold text-emerald-50">Email sent successfully</p>
          <p className="mt-1 text-emerald-100/90">Resend message id: {result.messageId}</p>
          <p className="mt-1 text-emerald-100/80">From: {result.from}</p>
          <p className="text-emerald-100/80">Reply-To: {result.replyTo}</p>
        </div>
      ) : null}

      {result && !result.ok ? (
        <div
          className="rounded-xl border border-dojo-red/50 bg-dojo-red/10 px-4 py-3 text-sm text-dojo-white"
          role="alert"
        >
          <p className="font-semibold text-dojo-red">Send failed</p>
          <p className="mt-1 text-dojo-muted">{result.error}</p>
        </div>
      ) : null}
    </div>
  );
}
