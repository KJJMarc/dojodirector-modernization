import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
  clubAdultBeltRankingsPath,
  clubJuniorBeltRankingsPath,
} from "@/lib/clubs.shared";
import { formatPortalMessagesNavLabel } from "@/lib/portal-messages.shared";
import { studentOfTheYearPublicPath } from "@/lib/student-of-the-year.shared";

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
  showJuniorBeltRankings: boolean;
  showStudentOfTheYear: boolean;
  showAdultAttendanceCard: boolean;
  showAgreementsPanel: boolean;
  juniorBeltRankingsHref: string | null;
  juniorBeltRankingsPublicHref: string | null;
  adultBeltRankingsHref: string | null;
  studentOfTheYearHref: string | null;
  gradingHistoryHref: string | null;
}

export interface StudentPortalQuickAction {
  label: string;
  href: string;
  openInNewTab: boolean;
}

function buildKidsStudentPortalUiConfig(
  clubSlug: string,
): StudentPortalUiConfig {
  return {
    clubDisplayName: "Kingston Jiu Jitsu Kids",
    pageTitle: "My Portal",
    showBookClass: false,
    showUpcomingBookings: false,
    showMessages: true,
    showGradingHistory: true,
    showAdultBeltRankings: false,
    showJuniorBeltLevels: true,
    showJuniorBeltRankings: false,
    showStudentOfTheYear: false,
    showAdultAttendanceCard: false,
    showAgreementsPanel: true,
    juniorBeltRankingsHref: clubJuniorBeltRankingsPath(clubSlug),
    juniorBeltRankingsPublicHref: null,
    adultBeltRankingsHref: null,
    studentOfTheYearHref: null,
    gradingHistoryHref: null,
  };
}

function buildBahamasStudentPortalUiConfig(
  clubSlug: string,
  clubName: string,
): StudentPortalUiConfig {
  return {
    clubDisplayName: clubName,
    pageTitle: "My Portal",
    showBookClass: true,
    showUpcomingBookings: true,
    showMessages: true,
    showGradingHistory: true,
    showAdultBeltRankings: true,
    showJuniorBeltLevels: false,
    showJuniorBeltRankings: true,
    showStudentOfTheYear: false,
    showAdultAttendanceCard: true,
    showAgreementsPanel: true,
    juniorBeltRankingsHref: null,
    juniorBeltRankingsPublicHref: clubJuniorBeltRankingsPath(clubSlug),
    adultBeltRankingsHref: clubAdultBeltRankingsPath(clubSlug),
    studentOfTheYearHref: null,
    gradingHistoryHref: null,
  };
}

function buildKingstonStudentPortalUiConfig(clubName: string): StudentPortalUiConfig {
  return {
    clubDisplayName: clubName,
    pageTitle: "My Portal",
    showBookClass: true,
    showUpcomingBookings: true,
    showMessages: true,
    showGradingHistory: true,
    showAdultBeltRankings: true,
    showJuniorBeltLevels: false,
    showJuniorBeltRankings: false,
    showStudentOfTheYear: true,
    showAdultAttendanceCard: true,
    showAgreementsPanel: true,
    juniorBeltRankingsHref: null,
    juniorBeltRankingsPublicHref: null,
    adultBeltRankingsHref: "/adult-belt-rankings",
    studentOfTheYearHref: studentOfTheYearPublicPath(),
    gradingHistoryHref: null,
  };
}

export function getStudentPortalUiConfig(clubSlug: string, clubName: string): StudentPortalUiConfig {
  if (clubSlug === KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG) {
    return buildKidsStudentPortalUiConfig(clubSlug);
  }

  if (clubSlug === BAHAMAS_JIU_JITSU_CLUB_SLUG) {
    return buildBahamasStudentPortalUiConfig(clubSlug, clubName);
  }

  return buildKingstonStudentPortalUiConfig(clubName);
}

export function buildStudentPortalQuickActions(input: {
  clubSlug: string;
  userId: string;
  uiConfig: StudentPortalUiConfig;
  showAdultBeltRankings: boolean;
  unreadMessageCount?: number;
}): StudentPortalQuickAction[] {
  const {
    clubSlug,
    userId,
    uiConfig,
    showAdultBeltRankings,
    unreadMessageCount = 0,
  } = input;
  const basePath = studentPortalPath(clubSlug, userId);
  const gradingHistoryHref = resolveStudentPortalGradingHistoryHref(
    clubSlug,
    userId,
    uiConfig,
  );

  return [
    uiConfig.showBookClass
      ? { label: "Book a Class", href: `${basePath}/book`, openInNewTab: false }
      : null,
    uiConfig.showUpcomingBookings
      ? { label: "Cancel Bookings", href: `${basePath}/bookings`, openInNewTab: false }
      : null,
    uiConfig.showMessages
      ? {
          label: formatPortalMessagesNavLabel(unreadMessageCount),
          href: `${basePath}/messages`,
          openInNewTab: false,
        }
      : null,
    gradingHistoryHref && uiConfig.showGradingHistory
      ? {
          label: "Grading History",
          href: gradingHistoryHref,
          openInNewTab: gradingHistoryHref.startsWith("http"),
        }
      : null,
    uiConfig.showJuniorBeltLevels && uiConfig.juniorBeltRankingsHref
      ? {
          label: "Junior Belt Levels",
          href: uiConfig.juniorBeltRankingsHref,
          openInNewTab: true,
        }
      : null,
    showAdultBeltRankings &&
    uiConfig.showAdultBeltRankings &&
    uiConfig.adultBeltRankingsHref
      ? {
          label: "Adult Belt Rankings",
          href: uiConfig.adultBeltRankingsHref,
          openInNewTab: true,
        }
      : null,
    showAdultBeltRankings &&
    uiConfig.showJuniorBeltRankings &&
    uiConfig.juniorBeltRankingsPublicHref
      ? {
          label: "Junior Belt Rankings",
          href: uiConfig.juniorBeltRankingsPublicHref,
          openInNewTab: true,
        }
      : null,
    showAdultBeltRankings &&
    uiConfig.showStudentOfTheYear &&
    uiConfig.studentOfTheYearHref
      ? {
          label: "Student of the Year",
          href: uiConfig.studentOfTheYearHref,
          openInNewTab: true,
        }
      : null,
  ].filter(Boolean) as StudentPortalQuickAction[];
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
