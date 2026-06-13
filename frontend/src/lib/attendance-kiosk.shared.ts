export const ATTENDANCE_KIOSK_NOT_BOOKED_TITLE =
  "Student not booked for this session";

export const ATTENDANCE_KIOSK_NOT_BOOKED_MESSAGE =
  "This student is registered with the academy but is not currently booked into this class.";

export const ATTENDANCE_KIOSK_GENERIC_ERROR_MESSAGE =
  "Unable to mark attendance. Please try again or ask an instructor.";

export type AttendanceKioskCheckInResult =
  | { status: "marked_present"; studentName: string }
  | { status: "already_present"; studentName: string }
  | { status: "not_booked_for_session"; studentName: string };

export type AttendanceKioskActionResult =
  | AttendanceKioskCheckInResult
  | { status: "error"; message: string };

export interface AttendanceKioskStudentOption {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  label: string;
  email: string | null;
  isBooked: boolean;
  isPresent: boolean;
  attendeeId: string | null;
}

export const ATTENDANCE_KIOSK_RESET_MS = 2500;
