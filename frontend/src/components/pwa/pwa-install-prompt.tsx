"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isPortalInstallPromptPath,
  isStandaloneDisplayMode,
  PWA_NAME,
} from "@/lib/pwa.shared";

const DISMISS_STORAGE_KEY = "dojo-director-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

  return isIos && isSafari;
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPortalInstallPromptPath(pathname)) {
      setVisible(false);
      return;
    }

    if (isStandaloneDisplayMode()) {
      setVisible(false);
      return;
    }

    if (window.localStorage.getItem(DISMISS_STORAGE_KEY) === "1") {
      setVisible(false);
      return;
    }

    if (isIosSafari()) {
      setShowIosInstructions(true);
      setVisible(true);
      return;
    }

    setShowIosInstructions(false);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [pathname]);

  function dismissPrompt() {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
    setVisible(false);
    setDeferredPrompt(null);
  }

  async function installApp() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <section
      aria-label="Install Dojo Director app"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-dojo-border bg-dojo-surface p-4 shadow-2xl shadow-black/40 sm:inset-x-auto sm:right-4"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-dojo-white">Install {PWA_NAME}</p>
          <p className="mt-1 text-sm text-dojo-muted">
            {showIosInstructions
              ? "Add this portal to your home screen for quick access in full-screen mode."
              : "Install the app on your device for quick access in full-screen mode."}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          className="rounded-md px-2 py-1 text-sm text-dojo-muted transition hover:bg-dojo-elevated hover:text-dojo-white"
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>
      </div>

      {showIosInstructions ? (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-dojo-muted">
          <li>Tap the Share button in Safari.</li>
          <li>Select &quot;Add to Home Screen&quot;.</li>
          <li>Tap Add to install {PWA_NAME}.</li>
        </ol>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={installApp}
            className="rounded-lg bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
          >
            Install app
          </button>
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-lg border border-dojo-border px-4 py-2 text-sm font-medium text-dojo-muted transition hover:border-dojo-red/40 hover:text-dojo-white"
          >
            Not now
          </button>
        </div>
      )}
    </section>
  );
}
