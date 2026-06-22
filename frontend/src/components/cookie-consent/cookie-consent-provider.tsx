"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CookieConsentBanner } from "@/components/cookie-consent/cookie-consent-banner";
import { CookieConsentPreferencesModal } from "@/components/cookie-consent/cookie-consent-preferences-modal";
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent.shared";
import {
  readCookieConsentFromStorage,
  writeCookieConsentToStorage,
} from "@/lib/cookie-consent.client";

interface CookieConsentContextValue {
  preferences: CookieConsentPreferences | null;
  hasStoredConsent: boolean;
  analyticsConsent: boolean;
  marketingConsent: boolean;
  bannerVisible: boolean;
  preferencesModalOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (input: { analytics: boolean; marketing: boolean }) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

export const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

interface CookieConsentProviderProps {
  children: ReactNode;
}

export function CookieConsentProvider({ children }: CookieConsentProviderProps) {
  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(
    null,
  );
  const [bannerVisible, setBannerVisible] = useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const syncFromStorage = useCallback(() => {
    const stored = readCookieConsentFromStorage();
    setPreferences(stored);
    setBannerVisible(stored === null);
  }, []);

  useEffect(() => {
    syncFromStorage();
    setHydrated(true);

    function handleConsentChanged() {
      syncFromStorage();
    }

    function handleOpenPreferences() {
      setPreferencesModalOpen(true);
    }

    window.addEventListener("dojo:cookie-consent-changed", handleConsentChanged);
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, handleOpenPreferences);

    return () => {
      window.removeEventListener("dojo:cookie-consent-changed", handleConsentChanged);
      window.removeEventListener(
        COOKIE_PREFERENCES_OPEN_EVENT,
        handleOpenPreferences,
      );
    };
  }, [syncFromStorage]);

  const persistPreferences = useCallback(
    (input: { analytics: boolean; marketing: boolean }) => {
      const stored = writeCookieConsentToStorage(input);
      setPreferences(stored);
      setBannerVisible(false);
      setPreferencesModalOpen(false);
    },
    [],
  );

  const acceptAll = useCallback(() => {
    persistPreferences({ analytics: true, marketing: true });
  }, [persistPreferences]);

  const rejectNonEssential = useCallback(() => {
    persistPreferences({ analytics: false, marketing: false });
  }, [persistPreferences]);

  const savePreferences = useCallback(
    (input: { analytics: boolean; marketing: boolean }) => {
      persistPreferences(input);
    },
    [persistPreferences],
  );

  const openPreferences = useCallback(() => {
    setPreferencesModalOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setPreferencesModalOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      preferences,
      hasStoredConsent: preferences !== null,
      analyticsConsent: preferences?.analytics ?? false,
      marketingConsent: preferences?.marketing ?? false,
      bannerVisible: hydrated && bannerVisible,
      preferencesModalOpen,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      openPreferences,
      closePreferences,
    }),
    [
      preferences,
      hydrated,
      bannerVisible,
      preferencesModalOpen,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      openPreferences,
      closePreferences,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {hydrated ? (
        <>
          {bannerVisible ? (
            <CookieConsentBanner
              onAcceptAll={acceptAll}
              onRejectNonEssential={rejectNonEssential}
              onManagePreferences={openPreferences}
            />
          ) : null}
          <CookieConsentPreferencesModal
            open={preferencesModalOpen}
            initialAnalytics={preferences?.analytics ?? false}
            initialMarketing={preferences?.marketing ?? false}
            onClose={closePreferences}
            onSave={savePreferences}
          />
        </>
      ) : null}
    </CookieConsentContext.Provider>
  );
}
