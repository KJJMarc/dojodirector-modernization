"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveAcademyPixelSettingsAction } from "@/app/admin/[clubSlug]/academy-pages/pixel-settings/actions";
import {
  GOOGLE_ADS_CONVERSION_LABEL_HELP,
  GOOGLE_TAG_ID_HELP,
  META_PIXEL_ID_HELP,
  type AcademyPixelSettingsFormState,
} from "@/lib/academy-pixel-settings.shared";
import { clubAcademyPagesAdminPath } from "@/lib/admin-academy-pages.shared";

interface AcademyPixelSettingsFormProps {
  settings: AcademyPixelSettingsFormState;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

const checkboxClassName =
  "h-4 w-4 rounded border-dojo-border bg-dojo-elevated text-dojo-red focus:ring-dojo-red/30";

export function AcademyPixelSettingsForm({ settings }: AcademyPixelSettingsFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [metaPixelEnabled, setMetaPixelEnabled] = useState(settings.metaPixelEnabled);
  const [googleTrackingEnabled, setGoogleTrackingEnabled] = useState(
    settings.googleTrackingEnabled,
  );

  return (
    <form
      className={`space-y-5 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            await saveAcademyPixelSettingsAction(formData);
            setSuccessMessage("Pixel settings saved.");
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Unable to save pixel settings.",
            );
          }
        });
      }}
    >
      <input type="hidden" name="clubSlug" value={settings.clubSlug} />

      <fieldset className="space-y-4 rounded-lg border border-dojo-border bg-dojo-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-dojo-white">Meta Pixel</legend>

        <label className="flex items-center gap-2 text-sm text-dojo-white">
          <input
            type="checkbox"
            name="metaPixelEnabled"
            checked={metaPixelEnabled}
            onChange={(event) => setMetaPixelEnabled(event.target.checked)}
            className={checkboxClassName}
          />
          Enable Meta Pixel tracking
        </label>

        <div className="space-y-1.5">
          <label htmlFor="metaPixelId" className={labelClassName}>
            Meta Pixel ID
          </label>
          <input
            id="metaPixelId"
            name="metaPixelId"
            type="text"
            inputMode="numeric"
            defaultValue={settings.metaPixelId}
            disabled={!metaPixelEnabled}
            placeholder="123456789012345"
            className={inputClassName}
          />
          <p className="text-xs text-dojo-muted">{META_PIXEL_ID_HELP}</p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-dojo-border bg-dojo-elevated p-4">
        <legend className="px-1 text-sm font-semibold text-dojo-white">
          Google tag / GA4 / Google Ads
        </legend>

        <label className="flex items-center gap-2 text-sm text-dojo-white">
          <input
            type="checkbox"
            name="googleTrackingEnabled"
            checked={googleTrackingEnabled}
            onChange={(event) => setGoogleTrackingEnabled(event.target.checked)}
            className={checkboxClassName}
          />
          Enable Google tracking
        </label>

        <div className="space-y-1.5">
          <label htmlFor="googleTagId" className={labelClassName}>
            Google tag ID or GA4 measurement ID
          </label>
          <input
            id="googleTagId"
            name="googleTagId"
            type="text"
            defaultValue={settings.googleTagId}
            disabled={!googleTrackingEnabled}
            placeholder="G-XXXXXXXXXX"
            className={inputClassName}
          />
          <p className="text-xs text-dojo-muted">{GOOGLE_TAG_ID_HELP}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="googleAdsConversionLabel" className={labelClassName}>
            Google Ads conversion label
          </label>
          <input
            id="googleAdsConversionLabel"
            name="googleAdsConversionLabel"
            type="text"
            defaultValue={settings.googleAdsConversionLabel}
            disabled={!googleTrackingEnabled}
            placeholder="AbCdEfGhIjKlMnOp"
            className={inputClassName}
          />
          <p className="text-xs text-dojo-muted">{GOOGLE_ADS_CONVERSION_LABEL_HELP}</p>
        </div>
      </fieldset>

      {errorMessage ? (
        <p
          className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : "Save Pixel Settings"}
        </button>
        <Link
          href={clubAcademyPagesAdminPath(settings.clubSlug)}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
