/** Booking statuses included on the attendance register and session card counts. */
export const ATTENDANCE_REGISTER_BOOKING_STATUSES = ["booked", "walk_in"] as const;

export type AttendanceRegisterBookingStatus =
  (typeof ATTENDANCE_REGISTER_BOOKING_STATUSES)[number];

export function countsTowardAttendanceRegister(bookingStatus: string | null) {
  return (
    bookingStatus === "booked" || bookingStatus === "walk_in"
  );
}

/** Matches rows shown on the attendance register (status + linked student). */
export function countsAsAttendanceRegisterStudent(attendee: {
  booking_status: string | null;
  user_id?: string | null;
}) {
  return countsTowardAttendanceRegister(attendee.booking_status) && Boolean(attendee.user_id);
}
