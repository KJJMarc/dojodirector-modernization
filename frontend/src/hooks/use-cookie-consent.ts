"use client";

import { useContext } from "react";
import { CookieConsentContext } from "@/components/cookie-consent/cookie-consent-provider";

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);

  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }

  return context;
}
