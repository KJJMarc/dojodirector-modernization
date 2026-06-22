"use client";

import { COOKIE_PREFERENCES_OPEN_EVENT } from "@/lib/cookie-consent.shared";

const FOOTER_LINK_CLASSNAME =
  "text-neutral-400 underline-offset-4 transition hover:text-white hover:underline";

export function CookiePreferencesLink() {
  function openPreferences() {
    window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_OPEN_EVENT));
  }

  return (
    <button type="button" onClick={openPreferences} className={FOOTER_LINK_CLASSNAME}>
      Cookie Preferences
    </button>
  );
}
