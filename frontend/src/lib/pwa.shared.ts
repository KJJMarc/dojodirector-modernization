export const PWA_NAME = "Dojo Director";
export const PWA_SHORT_NAME = "DojoDirector";
export const PWA_DESCRIPTION =
  "Class booking, attendance tracking and grading management for martial arts academies.";
export const PWA_THEME_COLOR = "#0a0a0a";
export const PWA_BACKGROUND_COLOR = "#0a0a0a";
export const PWA_START_URL = "/app";
export const PWA_SCOPE = "/";

export const PWA_ICON_PATHS = {
  favicon32: "/icon.png",
  apple180: "/apple-icon.png",
  icon192: "/pwa/icon-192.png",
  icon512: "/pwa/icon-512.png",
  maskable512: "/pwa/icon-maskable-512.png",
  splash1290: "/pwa/apple-splash-1290x2796.png",
} as const;

export function isPortalInstallPromptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/student-portal") ||
    pathname.startsWith("/instructor-portal")
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
