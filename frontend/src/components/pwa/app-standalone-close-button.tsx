"use client";

import Link from "next/link";
import { useStandaloneDisplayMode } from "@/lib/pwa-display-mode";
import { resolveAppStandaloneCloseHref } from "@/lib/pwa.shared";

/**
 * Standalone-PWA-only × control for public academy pages.
 * Returns to the app home (/app) so users can leave chrome-less public views.
 */
export function AppStandaloneCloseButton() {
  const isStandalone = useStandaloneDisplayMode();

  if (!isStandalone) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-start"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <Link
        href={resolveAppStandaloneCloseHref()}
        className="pointer-events-auto ml-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-white sm:ml-3"
        aria-label="Close and return to app home"
        data-testid="app-standalone-close"
      >
        <span aria-hidden="true" className="text-3xl leading-none">
          ×
        </span>
      </Link>
    </div>
  );
}
