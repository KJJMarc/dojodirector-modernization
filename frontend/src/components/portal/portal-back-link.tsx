"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  isStandaloneDisplayMode,
  PWA_APP_ENTRY_PATH,
} from "@/lib/pwa.shared";

const subscribe = () => () => {};

function getClientStandaloneSnapshot() {
  return isStandaloneDisplayMode();
}

function getServerStandaloneSnapshot() {
  return false;
}

interface PortalBackLinkProps {
  portalHomeHref?: string;
}

export function PortalBackLink({ portalHomeHref }: PortalBackLinkProps) {
  const isStandalone = useSyncExternalStore(
    subscribe,
    getClientStandaloneSnapshot,
    getServerStandaloneSnapshot,
  );

  const href = isStandalone
    ? PWA_APP_ENTRY_PATH
    : portalHomeHref ?? "/";

  const label = isStandalone
    ? "Back to App Home"
    : portalHomeHref
      ? "Back to Portal Home"
      : "Back to Home";

  return (
    <Link
      href={href}
      className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
    >
      ← {label}
    </Link>
  );
}
