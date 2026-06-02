import {
  clubAdminPath,
  clubBookingPath,
  clubJuniorBeltRankingsPath,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";

export interface AcademyPublicPageDefinition {
  id: string;
  name: string;
  description: string;
  pathLabel: string;
  resolveHref: (clubSlug: string) => string;
  /** When set, the page is shown only for these club slugs. */
  clubSlugs?: string[];
}

const GUEST_BOOKINGS_PAGE: AcademyPublicPageDefinition = {
  id: "guest-bookings",
  name: "Guest Bookings",
  description: "Public booking page for prospective and existing students.",
  pathLabel: "/book",
  resolveHref: (clubSlug) => clubBookingPath(clubSlug),
};

const ADULT_BELT_RANKINGS_PAGE: AcademyPublicPageDefinition = {
  id: "adult-belt-rankings",
  name: "Adult Belt Rankings",
  description: "Public academy belt rankings and recent promotions.",
  pathLabel: "/adult-belt-rankings",
  resolveHref: () => "/adult-belt-rankings",
  clubSlugs: [KINGSTON_CLUB_SLUG],
};

const JUNIOR_BELT_RANKINGS_PAGE: AcademyPublicPageDefinition = {
  id: "junior-belt-rankings",
  name: "Junior Belt Rankings",
  description: "Public junior belt rankings and recent promotions for the Kids academy.",
  pathLabel: "/junior-belt-rankings",
  resolveHref: (clubSlug) => clubJuniorBeltRankingsPath(clubSlug),
  clubSlugs: [KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG],
};

/** Single source of truth for public academy pages shown in admin. */
export const ACADEMY_PUBLIC_PAGES: AcademyPublicPageDefinition[] = [
  GUEST_BOOKINGS_PAGE,
  ADULT_BELT_RANKINGS_PAGE,
  JUNIOR_BELT_RANKINGS_PAGE,
];

export function clubAcademyPagesAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "academy-pages");
}

export function getAcademyPublicPagesForClub(clubSlug: string) {
  const normalizedSlug = clubSlug.trim().toLowerCase();

  return ACADEMY_PUBLIC_PAGES.filter(
    (page) =>
      !page.clubSlugs ||
      page.clubSlugs.some((slug) => slug.toLowerCase() === normalizedSlug),
  ).map((page) => ({
    ...page,
    href: page.resolveHref(clubSlug),
    pathLabel:
      page.id === "guest-bookings"
        ? clubBookingPath(clubSlug)
        : page.id === "junior-belt-rankings"
          ? clubJuniorBeltRankingsPath(clubSlug)
          : page.pathLabel,
  }));
}
