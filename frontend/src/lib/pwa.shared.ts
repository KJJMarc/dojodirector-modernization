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
export const PWA_ICON_ASSET_VERSION = "3";

export function versionedAssetPath(path: string): string {
  return `${path}?v=${PWA_ICON_ASSET_VERSION}`;
}

export const PWA_ICON_PATHS = {
  favicon16: versionedAssetPath("/icon-16.png"),
  favicon32: versionedAssetPath("/icon.png"),
  faviconIco: versionedAssetPath("/favicon.ico"),
  apple180: versionedAssetPath("/apple-icon.png"),
  icon192: versionedAssetPath("/pwa/icon-192.png"),
  icon512: versionedAssetPath("/pwa/icon-512.png"),
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
