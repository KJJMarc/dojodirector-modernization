import {
  clubAdminPath,
  clubBookingPath,
  clubJuniorBeltRankingsPath,
  clubTrialEnquiryPath,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import {
  STUDENT_OF_THE_YEAR_PAGE_ID,
  studentOfTheYearAdminEditPath,
  studentOfTheYearPublicPath,
} from "@/lib/student-of-the-year.shared";

export interface AcademyPublicPageDefinition {
  id: string;
  name: string;
  description: string;
  pathLabel: string;
  resolveHref: (clubSlug: string) => string;
  resolveEditHref?: (clubSlug: string) => string;
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

const TRIAL_ENQUIRY_PAGE: AcademyPublicPageDefinition = {
  id: "trial-enquiry",
  name: "Trial Enquiry Form",
  description: "Public trial enquiry and lead capture page",
  pathLabel: "/trial-enquiry",
  resolveHref: (clubSlug) => clubTrialEnquiryPath(clubSlug),
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

const STUDENT_OF_THE_YEAR_PAGE: AcademyPublicPageDefinition = {
  id: STUDENT_OF_THE_YEAR_PAGE_ID,
  name: "Student of the Year",
  description: "Annual Kingston Jiu Jitsu Adults Student of the Year winners.",
  pathLabel: studentOfTheYearPublicPath(),
  resolveHref: () => studentOfTheYearPublicPath(),
  resolveEditHref: (clubSlug) => studentOfTheYearAdminEditPath(clubSlug),
  clubSlugs: [KINGSTON_CLUB_SLUG],
};

/** Single source of truth for public academy pages shown in admin. */
export const ACADEMY_PUBLIC_PAGES: AcademyPublicPageDefinition[] = [
  GUEST_BOOKINGS_PAGE,
  TRIAL_ENQUIRY_PAGE,
  ADULT_BELT_RANKINGS_PAGE,
  STUDENT_OF_THE_YEAR_PAGE,
  JUNIOR_BELT_RANKINGS_PAGE,
];

export function clubAcademyPagesAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "academy-pages");
}

export function getAcademyPublicPageById(pageId: string) {
  return ACADEMY_PUBLIC_PAGES.find((page) => page.id === pageId) ?? null;
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
    editHref: page.resolveEditHref?.(clubSlug) ?? null,
    pathLabel:
      page.id === "guest-bookings"
        ? clubBookingPath(clubSlug)
        : page.id === "trial-enquiry"
          ? clubTrialEnquiryPath(clubSlug)
          : page.id === "junior-belt-rankings"
            ? clubJuniorBeltRankingsPath(clubSlug)
            : page.pathLabel,
  }));
}
