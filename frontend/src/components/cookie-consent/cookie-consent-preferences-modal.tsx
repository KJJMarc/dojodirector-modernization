"use client";

import { useEffect, useState } from "react";

interface CookieConsentPreferencesModalProps {
  open: boolean;
  initialAnalytics: boolean;
  initialMarketing: boolean;
  onClose: () => void;
  onSave: (input: { analytics: boolean; marketing: boolean }) => void;
}

interface CookiePreferenceToggleProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

function CookiePreferenceToggle({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: CookiePreferenceToggleProps) {
  return (
    <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-dojo-white">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-dojo-muted">{description}</p>
        </div>

        {disabled ? (
          <span className="shrink-0 rounded-full bg-dojo-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-dojo-muted">
            Always on
          </span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={`${title} cookies`}
            onClick={() => onChange?.(!checked)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
              checked ? "bg-dojo-red" : "bg-dojo-border"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                checked ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

export function CookieConsentPreferencesModal({
  open,
  initialAnalytics,
  initialMarketing,
  onClose,
  onSave,
}: CookieConsentPreferencesModalProps) {
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [marketing, setMarketing] = useState(initialMarketing);

  useEffect(() => {
    if (open) {
      setAnalytics(initialAnalytics);
      setMarketing(initialMarketing);
    }
  }, [open, initialAnalytics, initialMarketing]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close cookie preferences"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-preferences-title"
        className="relative z-[61] w-full max-w-lg rounded-xl border border-dojo-border bg-dojo-surface p-5 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="cookie-preferences-title"
              className="text-lg font-semibold text-dojo-white"
            >
              Cookie Preferences
            </h2>
            <p className="mt-1 text-sm text-dojo-muted">
              Choose which optional cookies you are happy for us to use.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-dojo-muted transition hover:bg-dojo-elevated hover:text-dojo-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <CookiePreferenceToggle
            title="Strictly Necessary Cookies"
            description="Required for secure sign-in, session management, bookings, attendance and core platform functionality. These cannot be switched off."
            checked
            disabled
          />
          <CookiePreferenceToggle
            title="Analytics Cookies"
            description="Help us understand how public academy pages are used, for example through Google Analytics tags configured by an academy."
            checked={analytics}
            onChange={setAnalytics}
          />
          <CookiePreferenceToggle
            title="Marketing Cookies"
            description="Used to measure advertising performance, such as Meta Pixel and Google Ads tags configured by an academy."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-dojo-border px-4 py-2 text-sm font-medium text-dojo-muted transition hover:border-dojo-red/40 hover:text-dojo-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ analytics, marketing })}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
