"use client";

import { useSyncExternalStore } from "react";
import { isStandaloneDisplayMode } from "@/lib/pwa.shared";

function subscribeStandaloneDisplayMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getStandaloneDisplayModeSnapshot(): boolean {
  return isStandaloneDisplayMode();
}

function getStandaloneDisplayModeServerSnapshot(): boolean {
  return false;
}

/** True when the page is running as an installed PWA (standalone display mode). */
export function useStandaloneDisplayMode(): boolean {
  return useSyncExternalStore(
    subscribeStandaloneDisplayMode,
    getStandaloneDisplayModeSnapshot,
    getStandaloneDisplayModeServerSnapshot,
  );
}
