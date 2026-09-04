"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStandaloneDisplayMode } from "@/lib/pwa-display-mode";
import {
  APP_STANDALONE_RETURN_TO_PARAM,
  resolveAppStandaloneCloseHref,
} from "@/lib/pwa.shared";

function AppStandaloneCloseButtonInner() {
  const isStandalone = useStandaloneDisplayMode();
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = searchParams.get(APP_STANDALONE_RETURN_TO_PARAM);
  const closeHref = resolveAppStandaloneCloseHref(returnTo);

  const handleClose = useCallback(() => {
    if (returnTo && closeHref === returnTo) {
      router.replace(closeHref);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(closeHref);
  }, [closeHref, returnTo, router]);

  if (!isStandalone) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-start"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={handleClose}
        className="pointer-events-auto ml-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-white sm:ml-3"
        aria-label="Close and return to previous page"
        data-testid="app-standalone-close"
      >
        <span aria-hidden="true" className="text-3xl leading-none">
          ×
        </span>
      </button>
    </div>
  );
}

/**
 * Standalone-PWA-only × control for public academy pages.
 * Returns to the portal page the user came from (returnTo), or history.back().
 */
export function AppStandaloneCloseButton() {
  return (
    <Suspense fallback={null}>
      <AppStandaloneCloseButtonInner />
    </Suspense>
  );
}
