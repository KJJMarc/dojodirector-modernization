/** Booking statuses included on the attendance register and session card counts. */
export const ATTENDANCE_REGISTER_BOOKING_STATUSES = ["booked", "walk_in"] as const;

export type AttendanceRegisterBookingStatus =
  (typeof ATTENDANCE_REGISTER_BOOKING_STATUSES)[number];

export function countsTowardAttendanceRegister(bookingStatus: string | null) {
  return (
    bookingStatus === "booked" || bookingStatus === "walk_in"
  );
}
