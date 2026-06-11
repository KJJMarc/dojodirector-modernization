import { clubAdminPath } from "@/lib/clubs.shared";

export const ATTENDANCE_REGISTER_NAV_FROM = {
  instructorPortal: "instructor-portal",
  adminDashboard: "admin-dashboard",
  manageBookings: "manage-bookings",
} as const;

export type AttendanceRegisterNavFrom =
  (typeof ATTENDANCE_REGISTER_NAV_FROM)[keyof typeof ATTENDANCE_REGISTER_NAV_FROM];

export const ATTENDANCE_SESSION_LIST_MODE = {
  register: "register",
  kiosk: "kiosk",
} as const;

export type AttendanceSessionListMode =
  (typeof ATTENDANCE_SESSION_LIST_MODE)[keyof typeof ATTENDANCE_SESSION_LIST_MODE];

export interface AttendanceRegisterNavContext {
  from: AttendanceRegisterNavFrom;
  clubSlug?: string;
  mode?: AttendanceSessionListMode;
  /** London calendar date (YYYY-MM-DD) for register date search. */
  date?: string;
  /** Inclusive day count ending on `date` or today (2–31). */
  days?: number;
}

export interface AttendanceRegisterSearchParams {
  from?: string | string[];
  club?: string | string[];
  date?: string | string[];
  days?: string | string[];
}

function normalizeSearchParam(value: string | string[] | undefined): string | undefined {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized?.trim() || undefined;
}

const ATTENDANCE_REGISTER_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseAttendanceRegisterDateFilter(
  searchParams: AttendanceRegisterSearchParams,
): Pick<AttendanceRegisterNavContext, "date" | "days"> {
  const rawDate = normalizeSearchParam(searchParams.date);
  const date =
    rawDate && ATTENDANCE_REGISTER_DATE_PATTERN.test(rawDate) ? rawDate : undefined;
  const daysRaw = normalizeSearchParam(searchParams.days);
  const parsedDays = daysRaw ? Number(daysRaw) : undefined;
  const days =
    parsedDays !== undefined &&
    Number.isInteger(parsedDays) &&
    parsedDays >= 2 &&
    parsedDays <= 31
      ? parsedDays
      : undefined;

  if (!date && !days) {
    return {};
  }

  return {
    ...(date ? { date } : {}),
    ...(days ? { days } : {}),
  };
}

export function parseAttendanceRegisterNavContext(
  searchParams: AttendanceRegisterSearchParams,
): AttendanceRegisterNavContext | null {
  const from = normalizeSearchParam(searchParams.from);
  const clubSlug = normalizeSearchParam(searchParams.club);
  const dateFilter = parseAttendanceRegisterDateFilter(searchParams);

  if (from === ATTENDANCE_REGISTER_NAV_FROM.instructorPortal) {
    return clubSlug
      ? { from, clubSlug, ...dateFilter }
      : { from, ...dateFilter };
  }

  if (from === ATTENDANCE_REGISTER_NAV_FROM.adminDashboard && clubSlug) {
    return { from, clubSlug, ...dateFilter };
  }

  if (from === ATTENDANCE_REGISTER_NAV_FROM.manageBookings && clubSlug) {
    return { from, clubSlug, ...dateFilter };
  }

  return null;
}

export function buildAttendanceRegisterNavQuery(
  context: AttendanceRegisterNavContext,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("from", context.from);

  if (context.clubSlug) {
    params.set("club", context.clubSlug);
  }

  if (context.date) {
    params.set("date", context.date);
  }

  if (context.days) {
    params.set("days", String(context.days));
  }

  return params;
}

export function withAttendanceRegisterNavContext(
  path: string,
  context: AttendanceRegisterNavContext,
): string {
  const [pathname, existingSearch = ""] = path.split("?");
  const params = new URLSearchParams(existingSearch);

  buildAttendanceRegisterNavQuery(context).forEach((value, key) => {
    params.set(key, value);
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function attendanceRegisterPath(
  context?: AttendanceRegisterNavContext | null,
): string {
  if (!context) {
    return "/attendance";
  }

  return withAttendanceRegisterNavContext("/attendance", context);
}

export function instructorPortalAttendanceRegisterPath(clubSlug: string): string {
  return withAttendanceRegisterNavContext("/attendance", {
    from: ATTENDANCE_REGISTER_NAV_FROM.instructorPortal,
    clubSlug,
  });
}

export function adminDashboardAttendanceRegisterPath(clubSlug: string): string {
  return withAttendanceRegisterNavContext("/attendance", {
    from: ATTENDANCE_REGISTER_NAV_FROM.adminDashboard,
    clubSlug,
  });
}

export function manageBookingsAttendanceRegisterPath(clubSlug: string): string {
  return withAttendanceRegisterNavContext("/attendance", {
    from: ATTENDANCE_REGISTER_NAV_FROM.manageBookings,
    clubSlug,
  });
}

import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";

export function resolveAttendanceRegisterBackLink(context: AttendanceRegisterNavContext): {
  href: string;
  label: string;
} {
  switch (context.from) {
    case ATTENDANCE_REGISTER_NAV_FROM.instructorPortal:
      return {
        href: context.clubSlug
          ? instructorPortalClubPath(context.clubSlug)
          : "/instructor-portal",
        label: "← Back to Instructor Portal",
      };
    case ATTENDANCE_REGISTER_NAV_FROM.adminDashboard:
      return {
        href: clubAdminPath(context.clubSlug!),
        label: "← Back to Admin Dashboard",
      };
    case ATTENDANCE_REGISTER_NAV_FROM.manageBookings:
      return {
        href: clubAdminPath(context.clubSlug!, "bookings"),
        label: "← Back to Manage Bookings",
      };
  }
}
