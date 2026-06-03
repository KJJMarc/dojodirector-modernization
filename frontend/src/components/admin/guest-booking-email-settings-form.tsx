"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  saveGuestBookingEmailSettingsAction,
  sendGuestBookingTestEmailAction,
  type GuestBookingEmailSettingsActionResult,
} from "@/app/admin/[clubSlug]/messaging/guest-booking-email-settings/actions";
import type { GuestBookingEmailSettingsFormState } from "@/lib/academy-email.shared";
import { clubAdminPath } from "@/lib/clubs.shared";

interface GuestBookingEmailSettingsFormProps {
  settings: GuestBookingEmailSettingsFormState;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

export function GuestBookingEmailSettingsForm({
  settings,
}: GuestBookingEmailSettingsFormProps) {
  const [saveResult, setSaveResult] = useState<GuestBookingEmailSettingsActionResult | null>(
    null,
  );
  const [testResult, setTestResult] = useState<GuestBookingEmailSettingsActionResult | null>(
    null,
  );
  const [isSavePending, startSaveTransition] = useTransition();
  const [isTestPending, startTestTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className={`space-y-4 ${isSavePending ? "pointer-events-none opacity-60" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          setSaveResult(null);
          const formData = new FormData(event.currentTarget);

          startSaveTransition(async () => {
            setSaveResult(await saveGuestBookingEmailSettingsAction(formData));
          });
        }}
      >
        <input type="hidden" name="clubSlug" value={settings.clubSlug} />

        {!settings.emailEnabled ? (
          <p className="rounded-lg border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-3 py-2 text-sm text-dojo-white">
            Academy email is disabled. Enable it under Set Academy Email before guest
            booking emails can send.
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-3">
          <input
            type="checkbox"
            name="guestBookingEmailEnabled"
            defaultChecked={settings.guestBookingEmailEnabled}
            className="mt-0.5 h-4 w-4 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red/30"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-semibold text-dojo-white">
              Send confirmation to guest
            </span>
            <span className="block text-xs text-dojo-muted">
              Email the booker after a successful public guest booking.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-3">
          <input
            type="checkbox"
            name="guestBookingNotifyAcademy"
            defaultChecked={settings.guestBookingNotifyAcademy}
            className="mt-0.5 h-4 w-4 rounded border-dojo-border bg-dojo-black text-dojo-red focus:ring-dojo-red/30"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-semibold text-dojo-white">
              Notify academy of guest booking
            </span>
            <span className="block text-xs text-dojo-muted">
              Send a notification to the academy contact email when a guest books.
            </span>
          </span>
        </label>

        {saveResult?.ok ? (
          <p
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
            role="status"
          >
            {saveResult.message}
          </p>
        ) : null}

        {saveResult && !saveResult.ok ? (
          <p
            className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red"
            role="alert"
          >
            {saveResult.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSavePending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/60 bg-dojo-red/10 px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red hover:bg-dojo-red/20 disabled:cursor-not-allowed"
        >
          {isSavePending ? "Saving…" : "Save settings"}
        </button>
      </form>

      <section className="space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4">
        <div>
          <h3 className="text-sm font-semibold text-dojo-white">Send test email</h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Sends a sample guest booking confirmation using this academy&apos;s email
            settings.
          </p>
        </div>

        <form
          className={`space-y-3 ${isTestPending ? "pointer-events-none opacity-60" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            setTestResult(null);
            const formData = new FormData(event.currentTarget);

            startTestTransition(async () => {
              setTestResult(await sendGuestBookingTestEmailAction(formData));
            });
          }}
        >
          <input type="hidden" name="clubSlug" value={settings.clubSlug} />

          <div className="space-y-1.5">
            <label htmlFor="testRecipientEmail" className={labelClassName}>
              Recipient email
            </label>
            <input
              id="testRecipientEmail"
              name="recipientEmail"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClassName}
            />
          </div>

          {testResult?.ok ? (
            <p
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
              role="status"
            >
              {testResult.message}
            </p>
          ) : null}

          {testResult && !testResult.ok ? (
            <p
              className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red"
              role="alert"
            >
              {testResult.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isTestPending || !settings.emailEnabled}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-surface px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTestPending ? "Sending…" : "Send test guest confirmation"}
          </button>
        </form>
      </section>

      <Link
        href={clubAdminPath(settings.clubSlug, "messaging")}
        className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
      >
        Back to Messaging
      </Link>
    </div>
  );
}
