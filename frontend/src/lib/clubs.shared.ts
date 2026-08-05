export const KINGSTON_CLUB_SLUG = "kingston-jiu-jitsu";
export const KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG = "kingston-jiu-jitsu-kids";
export const BAHAMAS_JIU_JITSU_CLUB_SLUG = "bahamas-jiu-jitsu";
/** Kingston Jiu Jitsu adult academy club id. */
export const KINGSTON_JIU_JITSU_CLUB_ID = "a869a3a1-2174-43a5-87d1-3f365f11c68a";
/** Kingston Jiu Jitsu Kids academy club id (grading + memberships). */
export const KINGSTON_JIU_JITSU_KIDS_CLUB_ID =
  "0e81995e-7ed5-490d-8425-f23c87f34587";
/** Kingston academies cap junior stripes at three (Bahamas remains at four). */
export const KINGSTON_JUNIOR_MAX_STRIPE_COUNT = 3;
/**
 * IANA timezone for academy-local civil times (wall clocks on schedules).
 * Recurring class start/end times are stored as academy-local clock values,
 * not UTC instants — display must not convert them for the visitor's timezone.
 */
export const DEFAULT_CLUB_IANA_TIME_ZONE = "Europe/London";
export const BAHAMAS_JIU_JITSU_IANA_TIME_ZONE = "America/Nassau";

/** Resolve the academy's IANA timezone for interpreting its local class times. */
export function getClubIanaTimeZone(clubSlug: string): string {
  const normalized = clubSlug.trim().toLowerCase();

  if (normalized === BAHAMAS_JIU_JITSU_CLUB_SLUG) {
    return BAHAMAS_JIU_JITSU_IANA_TIME_ZONE;
  }

  return DEFAULT_CLUB_IANA_TIME_ZONE;
}

export interface ClubRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export function parseClubSlugFromForm(formData: FormData): string {
  const slug = String(formData.get("clubSlug") ?? "").trim();
  return slug || KINGSTON_CLUB_SLUG;
}

/** Build a club admin path under /admin/[clubSlug]. */
export function clubAdminPath(slug: string, section?: string) {
  const base = `/admin/${slug}`;

  if (!section) {
    return base;
  }

  const normalized = section.replace(/^\/+/, "");
  return normalized ? `${base}/${normalized}` : base;
}

/** Public guest booking page for a club. */
export function clubBookingPath(slug: string) {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/book` : `/${KINGSTON_CLUB_SLUG}/book`;
}

/** Public trial enquiry page for a club. */
export function clubTrialEnquiryPath(slug: string) {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/trial-enquiry` : `/${KINGSTON_CLUB_SLUG}/trial-enquiry`;
}

/** Public class timetable page for a club (generated from active recurring classes). */
export function clubTimetablePath(slug: string) {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/timetable` : `/${KINGSTON_CLUB_SLUG}/timetable`;
}

/** POST endpoint for public trial enquiry submissions. */
export function clubTrialEnquiryApiPath(slug: string) {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return normalized
    ? `/api/${normalized}/trial-enquiry`
    : `/api/${KINGSTON_CLUB_SLUG}/trial-enquiry`;
}

/** Adult KJJ guest booking shows the student portal notice; Kids does not. */
export function shouldShowGuestBookingStudentPortalNotice(clubSlug: string) {
  return clubSlug.trim() === KINGSTON_CLUB_SLUG;
}

/** Public junior belt rankings page for a club. */
export function clubJuniorBeltRankingsPath(slug: string) {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return normalized
    ? `/${normalized}/junior-belt-rankings`
    : `/${KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG}/junior-belt-rankings`;
}

/** Public adult belt rankings page for a club-scoped academy route. */
export function clubAdultBeltRankingsPath(slug: string) {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/adult-belt-rankings` : "/adult-belt-rankings";
}
