import { clubAdminPath } from "@/lib/clubs.shared";

export const ATTENDANCE_REGISTER_NAV_FROM = {
  instructorPortal: "instructor-portal",
  adminDashboard: "admin-dashboard",
  manageBookings: "manage-bookings",
} as const;

export type AttendanceRegisterNavFrom =
  (typeof ATTENDANCE_REGISTER_NAV_FROM)[keyof typeof ATTENDANCE_REGISTER_NAV_FROM];

export interface AttendanceRegisterNavContext {
  from: AttendanceRegisterNavFrom;
  clubSlug?: string;
}

export interface AttendanceRegisterSearchParams {
  from?: string | string[];
  club?: string | string[];
}

function normalizeSearchParam(value: string | string[] | undefined): string | undefined {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized?.trim() || undefined;
}

export function parseAttendanceRegisterNavContext(
  searchParams: AttendanceRegisterSearchParams,
): AttendanceRegisterNavContext | null {
  const from = normalizeSearchParam(searchParams.from);
  const clubSlug = normalizeSearchParam(searchParams.club);

  if (from === ATTENDANCE_REGISTER_NAV_FROM.instructorPortal) {
    return clubSlug ? { from, clubSlug } : { from };
  }

  if (from === ATTENDANCE_REGISTER_NAV_FROM.adminDashboard && clubSlug) {
    return { from, clubSlug };
  }

  if (from === ATTENDANCE_REGISTER_NAV_FROM.manageBookings && clubSlug) {
    return { from, clubSlug };
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

  return params;
}

export function withAttendanceRegisterNavContext(
  path: string,
  context: AttendanceRegisterNavContext,
): string {
  const [pathname, existingSearch = ""] = path.split("?");
  const params = new URLSearchParams(existingSearch);

  for (const [key, value] of buildAttendanceRegisterNavQuery(context).entries()) {
    params.set(key, value);
  }

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
