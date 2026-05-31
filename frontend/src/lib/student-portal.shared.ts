import type { YearlyGridRow } from "@/lib/attendance-card";
import type { StudentAgreementStatusSummary } from "@/lib/student-portal-agreements.shared";

export type StudentPortalMemberBookingStatus = "booked" | "waitlisted" | null;

export interface StudentPortalBookableSession {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  instructorName: string | null;
  spacesAvailable: number | null;
  spacesAvailableLabel: string;
  memberBookingStatus: StudentPortalMemberBookingStatus;
  memberBookingStatusLabel: string | null;
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

export interface StudentPortalUpcomingBooking {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  instructorName: string | null;
  bookingStatus: string;
  dateLabel: string;
  timeLabel: string;
}

export interface StudentPortalPageData {
  studentName: string;
  membershipStatus: string | null;
  currentBeltLabel: string;
  agreementStatus: StudentAgreementStatusSummary;
  attendanceCardYear: number;
  attendanceRows: YearlyGridRow[];
  totalAttendanceForYear: number;
  attendanceBeltLabel: string | null;
}

export interface StudentPortalAttendancePageData {
  studentName: string;
  year: number;
  attendanceRows: YearlyGridRow[];
  totalAttendanceForYear: number;
  attendanceBeltLabel: string | null;
}

export interface StudentPortalBookingsPageData {
  studentName: string;
  upcomingBookings: StudentPortalUpcomingBooking[];
}

export interface StudentPortalBookPageData {
  studentName: string;
  bookableSessionGroups: StudentPortalBookableSessionGroup[];
}
