import {
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
  clubJuniorBeltRankingsPath,
} from "@/lib/clubs.shared";

export type StudentPortalSection =
  | "attendance"
  | "book"
  | "bookings"
  | "grading-history"
  | "messages";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStudentPortalUserIdParam(value: string) {
  return UUID_PATTERN.test(value.trim());
}

export function studentPortalPath(
  clubSlug: string,
  userId: string,
  section?: StudentPortalSection,
) {
  const normalizedClubSlug = clubSlug.trim().replace(/^\/+|\/+$/g, "");
  const normalizedUserId = userId.trim();
  const base = `/student-portal/${normalizedClubSlug}/${normalizedUserId}`;

  return section ? `${base}/${section}` : base;
}

export function studentPortalEntryPath() {
  return "/student-portal";
}

export function studentPortalLoginPath() {
  return "/student-portal/login";
}

export function studentPortalAgreementsPath() {
  return "/student-portal/agreements";
}

/** @deprecated Legacy user-only path — prefer studentPortalPath(clubSlug, userId). */
export function legacyStudentPortalPath(userId: string, section?: StudentPortalSection) {
  const base = `/student-portal/legacy/${userId.trim()}`;
  return section ? `${base}/${section}` : base;
}

export interface StudentPortalUiConfig {
  clubDisplayName: string | null;
  pageTitle: string;
  showBookClass: boolean;
  showUpcomingBookings: boolean;
  showMessages: boolean;
  showGradingHistory: boolean;
  showAdultBeltRankings: boolean;
  showJuniorBeltLevels: boolean;
  showAdultAttendanceCard: boolean;
  showAgreementsPanel: boolean;
  juniorBeltRankingsHref: string | null;
  gradingHistoryHref: string | null;
}

export function getStudentPortalUiConfig(clubSlug: string, clubName: string): StudentPortalUiConfig {
  if (clubSlug === KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG) {
    return {
      clubDisplayName: "Kingston Jiu Jitsu Kids",
      pageTitle: "My Portal",
      showBookClass: false,
      showUpcomingBookings: false,
      showMessages: true,
      showGradingHistory: true,
      showAdultBeltRankings: false,
      showJuniorBeltLevels: true,
      showAdultAttendanceCard: false,
      showAgreementsPanel: true,
      juniorBeltRankingsHref: clubJuniorBeltRankingsPath(clubSlug),
      gradingHistoryHref: null,
    };
  }

  return {
    clubDisplayName: clubName,
    pageTitle: "My Portal",
    showBookClass: true,
    showUpcomingBookings: true,
    showMessages: true,
    showGradingHistory: true,
    showAdultBeltRankings: true,
    showJuniorBeltLevels: false,
    showAdultAttendanceCard: true,
    showAgreementsPanel: true,
    juniorBeltRankingsHref: null,
    gradingHistoryHref: null,
  };
}

export function resolveStudentPortalGradingHistoryHref(
  clubSlug: string,
  userId: string,
  config: Pick<StudentPortalUiConfig, "showGradingHistory">,
) {
  if (!config.showGradingHistory) {
    return null;
  }

  return studentPortalPath(clubSlug, userId, "grading-history");
}

export { KINGSTON_CLUB_SLUG, KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG };
