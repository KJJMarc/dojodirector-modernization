/**
 * Canonical public SEO origin and sitemap path catalogue for Dojo Director.
 * Sitemap URLs always use the production www host so previews never leak into Google.
 */

import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  clubAdultBeltRankingsPath,
  clubJuniorBeltRankingsPath,
  clubTimetablePath,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import { studentOfTheYearPublicPath } from "@/lib/student-of-the-year.shared";

/** Production www origin — required for sitemap and public robots declaration. */
export const CANONICAL_SITE_ORIGIN = "https://www.dojodirector.com";

/** Absolute sitemap location declared in robots.txt. */
export const CANONICAL_SITEMAP_URL = `${CANONICAL_SITE_ORIGIN}/sitemap.xml`;

export type PublicSitemapEntry = {
  /** Path starting with `/`. */
  path: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
};

/**
 * Platform legal + marketing surfaces that are deliberately public and indexable.
 * `/privacy` is a duplicate of `/privacy-policy` and is omitted (footer uses privacy-policy).
 */
const PLATFORM_SITEMAP_ENTRIES: PublicSitemapEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.4 },
];

/**
 * Academy-facing pages the product intentionally publishes (Academy Pages catalogue)
 * that are suitable for search indexing. Booking and trial-enquiry forms are excluded.
 */
function buildPublicAcademySitemapEntries(): PublicSitemapEntry[] {
  const entries: PublicSitemapEntry[] = [
    // Kingston adult rankings use a stable root path (legacy-friendly).
    {
      path: "/adult-belt-rankings",
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      path: clubAdultBeltRankingsPath(BAHAMAS_JIU_JITSU_CLUB_SLUG),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      path: clubJuniorBeltRankingsPath(KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      path: clubJuniorBeltRankingsPath(BAHAMAS_JIU_JITSU_CLUB_SLUG),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      path: studentOfTheYearPublicPath(),
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];

  const timetableClubSlugs = [
    KINGSTON_CLUB_SLUG,
    KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
    BAHAMAS_JIU_JITSU_CLUB_SLUG,
  ];

  for (const clubSlug of timetableClubSlugs) {
    entries.push({
      path: clubTimetablePath(clubSlug),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}

/** Deduped ordered list of public paths for the production sitemap. */
export function getPublicSitemapEntries(): PublicSitemapEntry[] {
  const seen = new Set<string>();
  const entries: PublicSitemapEntry[] = [];

  for (const entry of [...PLATFORM_SITEMAP_ENTRIES, ...buildPublicAcademySitemapEntries()]) {
    if (seen.has(entry.path)) {
      continue;
    }

    seen.add(entry.path);
    entries.push(entry);
  }

  return entries;
}

/** Build an absolute https://www.dojodirector.com URL from a public path. */
export function absoluteCanonicalUrl(path: string): string {
  if (path === "/" || path === "") {
    return `${CANONICAL_SITE_ORIGIN}/`;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_SITE_ORIGIN}${normalized}`;
}

/**
 * Path prefixes robots should not crawl.
 * Covers admin, portals, auth, bookings, kiosks and other non-marketing surfaces.
 */
export function getRobotsDisallowPaths(): string[] {
  return [
    "/admin",
    "/admin-access",
    "/admin-login",
    "/super-admin",
    "/student-portal",
    "/instructor-portal",
    "/instructor",
    "/portal",
    "/attendance",
    "/students",
    "/forgot-password",
    "/reset-password",
    "/setup-password",
    "/auth",
    "/app",
    "/book",
    "/api",
  ];
}
