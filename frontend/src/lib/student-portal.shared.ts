import type {
  AttendanceCardHeaderStats,
  YearlyGridRow,
} from "@/lib/attendance-card";
import type { StudentAgreementStatusSummary } from "@/lib/student-portal-agreements.shared";

export type StudentPortalMemberBookingStatus = "booked" | null;

export interface StudentPortalBookableSession {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  spacesAvailable: number | null;
  spacesAvailableLabel: string;
  memberBookingStatus: StudentPortalMemberBookingStatus;
  memberBookingStatusLabel: string | null;
  waitlistStatus: "waiting" | "offered" | null;
  waitlistPosition: number | null;
  waitlistCount: number;
  offerExpiresAt: string | null;
  dateLabel: string;
  timeLabel: string;
  isFull: boolean;
}

export interface StudentPortalBookableSessionGroup {
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
  sessions: StudentPortalBookableSession[];
}

import type { StudentBookingCancelBlockedReason } from "@/lib/student-portal-booking-cancel.shared";

export interface StudentPortalUpcomingBooking {
  id: string;
  classSessionId: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  bookingStatus: string;
  dateLabel: string;
  timeLabel: string;
  canCancelBooking: boolean;
  cancelBlockedReason: StudentBookingCancelBlockedReason;
  cancelBlockedMessage: string | null;
}

export interface StudentPortalPageData {
  studentName: string;
  membershipStatus: string | null;
  currentBeltLabel: string;
  agreementStatus: StudentAgreementStatusSummary;
  /** Show BJJ-only portal actions (programme_memberships for BJJ). */
  showBjjPortalActions: boolean;
  /** Show BJJ attendance card section (programme access + attendance cards enabled). */
  showBjjAttendanceCard: boolean;
  /** Show current belt in portal header (BJJ access + belts/ranks enabled). */
  showCurrentBelt: boolean;
  attendanceCardYear?: number;
  attendanceRows?: YearlyGridRow[];
  totalAttendanceForYear?: number;
  attendanceBeltLabel?: string | null;
  attendanceHeaderStats?: AttendanceCardHeaderStats;
}

export interface StudentPortalAttendancePageData {
  studentName: string;
  year: number;
  attendanceRows: YearlyGridRow[];
  totalAttendanceForYear: number;
  attendanceBeltLabel: string | null;
  attendanceHeaderStats: AttendanceCardHeaderStats;
}

export interface StudentPortalBookingsPageData {
  studentName: string;
  upcomingBookings: StudentPortalUpcomingBooking[];
}

export interface StudentPortalBookPageData {
  bookableSessionGroups: StudentPortalBookableSessionGroup[];
}

export interface StudentPortalGradingHistoryEntry {
  id: string;
  dateLabel: string;
  previousRankLabel: string;
  newRankLabel: string;
  awardedByLabel: string | null;
}

export interface StudentPortalGradingHistoryPageData {
  studentName: string;
  entries: StudentPortalGradingHistoryEntry[];
}
