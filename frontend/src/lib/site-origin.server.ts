import "server-only";

const PRODUCTION_SITE_ORIGIN = "https://www.dojodirector.com";

/** Canonical site origin for auth links in emails (portal setup, password reset). */
export function resolveSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_ORIGIN;
  }

  return "http://localhost:3000";
}
