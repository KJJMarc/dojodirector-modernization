import type { ProgrammeType } from "@/lib/admin-programme-types";
import { RECURRING_CLASS_SESSION_DAYS_AHEAD } from "@/lib/admin-recurring-classes.shared";
import {
  addLondonCalendarDays,
  getLondonTodayDateKey,
} from "@/lib/london-datetime";

/** Repair target: exactly 52 non-cancelled future sessions (one year of weekly class). */
export const RECURRING_BLOCK_BOOKING_SESSION_COUNT = 52;

/** Maximum block-booking end date: 52 weeks from today. */
export const RECURRING_BLOCK_BOOKING_MAX_WEEKS = 52;

export const RECURRING_BLOCK_BOOKING_MAX_DAYS_AHEAD =
  RECURRING_CLASS_SESSION_DAYS_AHEAD;

export function getRecurringBlockBookingMaxEndDate(from = new Date()) {
  return addLondonCalendarDays(
    getLondonTodayDateKey(from),
    RECURRING_BLOCK_BOOKING_MAX_DAYS_AHEAD,
  );
}

export function getRecurringBlockBookingDefaultEndDate() {
  return getRecurringBlockBookingMaxEndDate();
}

export function getTodayDateInputValue(from = new Date()) {
  return getLondonTodayDateKey(from);
}

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
  trimmedCount: number;
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

export interface RecurringScheduleSessionHealth {
  futureSessionCount: number;
  requiredSessionCount: number;
  canBlockBook: boolean;
  warning: string | null;
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
  sessionHealth: RecurringScheduleSessionHealth;
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
