export type AttendanceKioskCheckInResult =
  | { status: "marked_present"; studentName: string }
  | { status: "already_present"; studentName: string };

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
