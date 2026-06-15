export const PRODUCT_NAME = "Dojo Director";
export const BRAND_PAGE_TITLE_PREFIX = "Dojo Director";

export function brandPageTitle(pageTitle: string): string {
  return `${BRAND_PAGE_TITLE_PREFIX} | ${pageTitle}`;
}

/** Active club for MVP; replace with context/provider when multi-club ships. */
export const ACTIVE_CLUB_NAME = "Kingston Jiu Jitsu";
export const ACTIVE_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
