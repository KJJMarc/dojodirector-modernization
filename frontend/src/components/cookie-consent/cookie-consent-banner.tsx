"use client";

interface CookieConsentBannerProps {
  onAcceptAll: () => void;
  onRejectNonEssential: () => void;
  onManagePreferences: () => void;
}

export function CookieConsentBanner({
  onAcceptAll,
  onRejectNonEssential,
  onManagePreferences,
}: CookieConsentBannerProps) {
  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-dojo-border bg-dojo-surface shadow-2xl shadow-black/40"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-sm leading-relaxed text-dojo-white">
          We use cookies to keep Dojo Director secure and functioning correctly,
          and optionally to help us improve the platform and measure marketing
          performance.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onAcceptAll}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={onRejectNonEssential}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-dojo-border px-4 py-2 text-sm font-medium text-dojo-muted transition hover:border-dojo-red/40 hover:text-dojo-white"
          >
            Reject Non-Essential
          </button>
          <button
            type="button"
            onClick={onManagePreferences}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-dojo-red transition hover:text-dojo-red-hover"
          >
            Manage Preferences
          </button>
        </div>
      </div>
    </section>
  );
}
