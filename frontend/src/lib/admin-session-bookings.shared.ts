import type { ProgrammeType } from "@/lib/admin-programme-types";

export interface SessionBookingAttendee {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  bookingStatus: string;
  attendanceStatus: string | null;
  bookedAt: string | null;
}

export interface AdminSessionBookingsView {
  session: {
    id: string;
    className: string;
    programmeType: ProgrammeType;
    startsAt: string;
    endsAt: string | null;
    location: string | null;
    capacity: number | null;
    bookedCount: number;
    waitlistCount: number;
    spacesAvailable: number | null;
    status: string | null;
    isCancelled: boolean;
    dateLabel: string;
    timeLabel: string;
    locationLabel: string;
    recurringScheduleId: string | null;
  };
  attendees: SessionBookingAttendee[];
}

export interface BookingStudentOption {
  id: string;
  label: string;
  email: string | null;
}

export interface BlockBookingResult {
  bookedCount: number;
  skipped: {
    cancelled: number;
    alreadyBooked: number;
    full: number;
  };
}

export interface CancelRecurringBookingResult {
  removedCount: number;
}

export interface RecurringScheduleStudentBookingSummary {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  futureBookingCount: number;
  nextSessionAt: string | null;
  bookedCount: number;
  waitlistedCount: number;
  walkInCount: number;
}

export interface RecurringScheduleBookingsPageData {
  schedule: {
    id: string;
    className: string;
    programmeType: ProgrammeType;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    capacity: number;
    location: string;
    isActive: boolean;
  };
  studentBookings: RecurringScheduleStudentBookingSummary[];
}

export function formatAdminBookingStatusLabel(status: string) {
  switch (status) {
    case "booked":
      return "Booked";
    case "waitlisted":
      return "Waitlisted";
    case "walk_in":
      return "Walk-in";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function formatAdminAttendanceStatusLabel(status: string | null) {
  switch (status) {
    case "present":
      return "Present";
    case "absent":
      return "Absent";
    case "not_marked":
      return "Not marked";
    default:
      return status ?? "Not marked";
  }
}
