import { isStudentMembershipRole } from "@/lib/admin-student-membership.shared";
import {
  isActiveMembershipStatus,
  normalizeMembershipStatusValue,
} from "@/lib/membership-status.shared";

/** Fallback class length when session.ends_at is missing. */
export const NO_SHOW_DEFAULT_CLASS_DURATION_MS = 90 * 60 * 1000;

/** Grace period after class end before unmarked bookings count as no-shows. */
export const NO_SHOW_REGISTER_GRACE_MS = 60 * 60 * 1000;

export interface NoShowSessionTiming {
  starts_at: string;
  ends_at: string | null;
  status?: string | null;
}

export function resolveEffectiveSessionEndMs(session: NoShowSessionTiming): number {
  if (session.ends_at) {
    const endsAtMs = new Date(session.ends_at).getTime();

    if (Number.isFinite(endsAtMs)) {
      return endsAtMs;
    }
  }

  const startsAtMs = new Date(session.starts_at).getTime();
  return startsAtMs + NO_SHOW_DEFAULT_CLASS_DURATION_MS;
}

export function isPresentAttendanceStatus(attendanceStatus: string | null) {
  return attendanceStatus === "present";
}

/** Sessions that have already started — used for retrospective instructor metrics. */
export function isRetrospectiveMetricsSession(
  session: { starts_at: string },
  nowIso: string,
) {
  return session.starts_at <= nowIso;
}

export function isNoShowBookingStatus(bookingStatus: string | null) {
  return bookingStatus === "booked" || bookingStatus === "walk_in";
}

export function isExplicitAbsentAttendanceStatus(attendanceStatus: string | null) {
  return attendanceStatus === "absent";
}

export function isCancelledSessionStatus(status: string | null | undefined) {
  return status === "cancelled";
}

export function hasNoShowEligibilityWindowPassed(
  session: NoShowSessionTiming,
  attendanceStatus: string | null,
  nowIso: string,
) {
  if (isCancelledSessionStatus(session.status)) {
    return false;
  }

  const nowMs = new Date(nowIso).getTime();
  const effectiveEndMs = resolveEffectiveSessionEndMs(session);

  if (isExplicitAbsentAttendanceStatus(attendanceStatus)) {
    return nowMs > effectiveEndMs;
  }

  return nowMs > effectiveEndMs + NO_SHOW_REGISTER_GRACE_MS;
}

export function isNoShow(
  bookingStatus: string | null,
  attendanceStatus: string | null,
  session: NoShowSessionTiming,
  nowIso: string,
) {
  return (
    isNoShowBookingStatus(bookingStatus) &&
    !isPresentAttendanceStatus(attendanceStatus) &&
    hasNoShowEligibilityWindowPassed(session, attendanceStatus, nowIso)
  );
}

/** Active or trial student memberships — same student role scope as retention, plus trial. */
export function isNoShowTrackingEligibleStudentMembership(membership: {
  role: string | null | undefined;
  status: string | null | undefined;
}) {
  if (!isStudentMembershipRole(membership.role)) {
    return false;
  }

  const normalized = normalizeMembershipStatusValue(membership.status);

  return isActiveMembershipStatus(membership.status) || normalized === "trial";
}

export interface ClassPopularityRow {
  rank: number;
  classId: string;
  className: string;
  scheduleLabel: string;
  dayLabel: string;
  timeLabel: string;
  locationLabel: string;
  instructorLabel: string;
  totalBookings: number;
  attendanceCount: number;
  utilisationPercent: number | null;
  sessionCount: number;
}

export interface InstructorMetricRow {
  rank: number;
  instructorUserId: string;
  instructorName: string;
  totalBookings: number;
  attendanceCount: number;
  sessionsTaught: number;
  averageAttendancePerSession: number | null;
  utilisationPercent: number | null;
}

export type NoShowTrackingStatus = "single" | "multiple" | "frequent";

/** Shown in Class Data no-show tracking help text and tooltips. */
export const NO_SHOW_TRACKING_DEFINITION =
  "A no-show occurs when a student books a class but is not marked present after the attendance register completion window has passed.";

/**
 * Future improvement: derive status from no-show rate (no-shows ÷ total bookings
 * over the last 90 days) so 2 no-shows from 50 bookings is treated differently
 * from 2 no-shows from 2 bookings.
 */
export const NO_SHOW_TRACKING_STATUS_NOTE =
  "Status is based on total no-shows in the reporting period. A no-show rate may be used in future.";

export function resolveNoShowTrackingStatus(
  totalNoShows: number,
): NoShowTrackingStatus {
  if (totalNoShows >= 4) {
    return "frequent";
  }

  if (totalNoShows >= 2) {
    return "multiple";
  }

  return "single";
}

export function formatNoShowTrackingStatusLabel(status: NoShowTrackingStatus) {
  switch (status) {
    case "single":
      return "Single no-show";
    case "multiple":
      return "Multiple no-shows";
    case "frequent":
      return "Frequent no-shows";
  }
}

export function noShowTrackingStatusBadgeClassName(status: NoShowTrackingStatus) {
  const base = "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold";

  switch (status) {
    case "single":
      return `${base} border border-dojo-border bg-dojo-elevated text-dojo-muted`;
    case "multiple":
      return `${base} bg-dojo-amber-500/15 text-dojo-amber-500`;
    case "frequent":
      return `${base} bg-dojo-red/20 text-dojo-red`;
  }
}

export interface NoShowStudentRow {
  userId: string;
  studentName: string;
  email: string | null;
  totalNoShows: number;
  recentNoShows: number;
  status: NoShowTrackingStatus;
  lastNoShowDate: string | null;
}

export interface ClassTrendRow {
  className: string;
  scheduleLabel: string;
  metricLabel: string;
  valueLabel: string;
}

export interface DayTimePopularityRow {
  dayLabel: string;
  timeLabel: string;
  totalBookings: number;
  attendanceCount: number;
}

export interface AdminClassMetricsPageData {
  periodLabel: string;
  totalNoShows: number;
  popularClasses: ClassPopularityRow[];
  instructorMetrics: InstructorMetricRow[];
  noShowStudents: NoShowStudentRow[];
  trends: {
    mostAttended: ClassTrendRow[];
    leastAttended: ClassTrendRow[];
    poorUtilisation: ClassTrendRow[];
    repeatedNoShows: ClassTrendRow[];
    popularDayTimes: DayTimePopularityRow[];
  };
  hasSessionData: boolean;
  trackedClassSlots: number;
}
