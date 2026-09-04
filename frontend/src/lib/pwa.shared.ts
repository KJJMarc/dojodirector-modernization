export const PWA_NAME = "Dojo Director";
export const PWA_SHORT_NAME = "Dojo Director";
export const PWA_DESCRIPTION =
  "Class booking, attendance tracking and grading management for martial arts academies.";
export const PWA_THEME_COLOR = "#0a0a0a";
export const PWA_BACKGROUND_COLOR = "#0a0a0a";
export const PWA_START_URL = "/app";
export const PWA_SCOPE = "/";
export const PWA_APP_ENTRY_PATH = "/app";

/** Bump when favicon/PWA raster assets change to defeat browser and SW caches. */
export const PWA_ICON_ASSET_VERSION = "4";

export const PWA_ICON_SOURCE_PATH = "/assets/dojo-director-icon.png";

export function versionedAssetPath(path: string): string {
  return `${path}?v=${PWA_ICON_ASSET_VERSION}`;
}

export const PWA_ICON_PATHS = {
  favicon16: versionedAssetPath("/favicon-16x16.png"),
  favicon32: versionedAssetPath("/favicon-32x32.png"),
  faviconIco: versionedAssetPath("/favicon.ico"),
  apple180: versionedAssetPath("/apple-touch-icon.png"),
  icon192: versionedAssetPath("/android-chrome-192x192.png"),
  icon512: versionedAssetPath("/android-chrome-512x512.png"),
  maskable512: versionedAssetPath("/pwa/icon-maskable-512.png"),
  splash1290: versionedAssetPath("/pwa/apple-splash-1290x2796.png"),
  manifest: versionedAssetPath("/manifest.webmanifest"),
} as const;

export function isPortalInstallPromptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/student-portal") ||
    pathname.startsWith("/instructor-portal")
  );
}

export function shouldRedirectPortalSignOutToAppEntry(
  redirectTo: string | null | undefined,
): boolean {
  return redirectTo === "app";
}

export function shouldUseAppEntryAfterPortalSignOut(formData?: FormData): boolean {
  return (
    formData?.get("useAppEntry") === "1" ||
    shouldRedirectPortalSignOutToAppEntry(formData?.get("redirectTo")?.toString())
  );
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true)
  );
}

export function appendPortalSignOutRedirect(formData: FormData) {
  if (isStandaloneDisplayMode()) {
    formData.set("useAppEntry", "1");
  }

  return formData;
}

/** Query param carrying the portal page to restore when closing a public view in the PWA. */
export const APP_STANDALONE_RETURN_TO_PARAM = "returnTo";

export function isSafeAppStandaloneReturnTo(returnTo: string): boolean {
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return false;
  }

  const pathname = returnTo.split("?")[0] ?? "";

  return (
    pathname === PWA_APP_ENTRY_PATH ||
    pathname.startsWith("/student-portal/") ||
    pathname === "/student-portal" ||
    pathname.startsWith("/instructor-portal/") ||
    pathname === "/instructor-portal"
  );
}

/** Attach a safe returnTo so the standalone × can restore the portal dashboard. */
export function appendAppStandaloneReturnTo(href: string, returnTo: string) {
  if (!isSafeAppStandaloneReturnTo(returnTo)) {
    return href;
  }

  try {
    const url = new URL(href, "https://dojodirector.invalid");
    url.searchParams.set(APP_STANDALONE_RETURN_TO_PARAM, returnTo);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/**
 * Destination for the standalone PWA × close control.
 * Prefer an explicit safe returnTo (portal dashboard); fall back to app home.
 */
export function resolveAppStandaloneCloseHref(returnTo?: string | null) {
  const candidate = returnTo?.trim();

  if (candidate && isSafeAppStandaloneReturnTo(candidate)) {
    return candidate;
  }

  return PWA_APP_ENTRY_PATH;
}
