"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveAcademyEmailSettingsAction } from "@/app/admin/[clubSlug]/messaging/email-settings/actions";
import {
  buildAcademyEmailHeadersPreview,
  type AcademyEmailSettingsFormState,
} from "@/lib/academy-email.shared";
import { clubAdminPath } from "@/lib/clubs.shared";

interface AcademyEmailSettingsFormProps {
  settings: AcademyEmailSettingsFormState;
  platformSenderEmail: string | null;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

export function AcademyEmailSettingsForm({
  settings,
  platformSenderEmail,
}: AcademyEmailSettingsFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [senderDisplayName, setSenderDisplayName] = useState(
    settings.senderDisplayName,
  );
  const [replyToEmail, setReplyToEmail] = useState(settings.replyToEmail);

  const headersPreview = useMemo(
    () =>
      buildAcademyEmailHeadersPreview({
        senderDisplayName,
        clubName: settings.clubName,
        replyToEmail,
        platformSenderEmail,
      }),
    [senderDisplayName, settings.clubName, replyToEmail, platformSenderEmail],
  );

  return (
    <form
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            await saveAcademyEmailSettingsAction(formData);
            setSuccessMessage("Academy email settings saved.");
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Unable to save academy email settings.",
            );
          }
        });
      }}
    >
      <input type="hidden" name="clubSlug" value={settings.clubSlug} />

      <div className="space-y-1.5">
        <label htmlFor="contactEmail" className={labelClassName}>
          Contact email
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          defaultValue={settings.contactEmail}
          autoComplete="email"
          className={inputClassName}
        />
        <p className="text-xs text-dojo-muted">
          Used for admin notifications and operational contact (not the From address).
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="replyToEmail" className={labelClassName}>
          Reply-to email
        </label>
        <input
          id="replyToEmail"
          name="replyToEmail"
          type="email"
          required
          value={replyToEmail}
          onChange={(event) => setReplyToEmail(event.target.value)}
          autoComplete="email"
          className={inputClassName}
        />
        <p className="text-xs text-dojo-muted">
          Replies to academy emails are sent to this address.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="senderDisplayName" className={labelClassName}>
          Sender display name
        </label>
        <input
          id="senderDisplayName"
          name="senderDisplayName"
          type="text"
          value={senderDisplayName}
          onChange={(event) => setSenderDisplayName(event.target.value)}
          placeholder={settings.clubName}
          className={inputClassName}
        />
        <p className="text-xs text-dojo-muted">
          Shown on outbound email. Defaults to the academy name when left blank.
        </p>
      </div>

      <div className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-3 text-sm text-dojo-muted">
        <p className="text-xs font-semibold uppercase tracking-wide text-dojo-white">
          Outbound email preview
        </p>
        <p className="mt-2">
          <span className="font-medium text-dojo-white">From:</span> {headersPreview.from}
        </p>
        <p className="mt-1">
          <span className="font-medium text-dojo-white">Reply-To:</span>{" "}
          {headersPreview.replyTo}
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-3">
        <input
          type="checkbox"
          name="emailEnabled"
          defaultChecked={settings.emailEnabled}
          className="mt-0.5 h-4 w-4 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red/30"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-semibold text-dojo-white">Email enabled</span>
          <span className="block text-xs text-dojo-muted">
            When off, Dojo Director will not send email for this academy.
          </span>
        </span>
      </label>

      {successMessage ? (
        <p
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : "Save settings"}
        </button>
        <Link
          href={clubAdminPath(settings.clubSlug, "messaging")}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Back to Messaging
        </Link>
      </div>
    </form>
  );
}
