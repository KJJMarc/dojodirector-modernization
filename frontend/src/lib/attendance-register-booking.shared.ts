/** Booking statuses included on the attendance register and session card counts. */
export const ATTENDANCE_REGISTER_BOOKING_STATUSES = ["booked", "walk_in"] as const;

export type AttendanceRegisterBookingStatus =
  (typeof ATTENDANCE_REGISTER_BOOKING_STATUSES)[number];

export function countsTowardAttendanceRegister(bookingStatus: string | null) {
  return (
    bookingStatus === "booked" || bookingStatus === "walk_in"
  );
}

/** Matches member rows shown on the attendance register. */
export function countsAsAttendanceRegisterStudent(attendee: {
  booking_status: string | null;
  user_id?: string | null;
}) {
  return countsTowardAttendanceRegister(attendee.booking_status) && Boolean(attendee.user_id);
}

/** Matches member or guest rows shown on the attendance register. */
export function countsAsAttendanceRegisterAttendee(attendee: {
  booking_status: string | null;
  user_id?: string | null;
  guest_booking_id?: string | null;
}) {
  return (
    countsTowardAttendanceRegister(attendee.booking_status) &&
    (Boolean(attendee.user_id) || Boolean(attendee.guest_booking_id))
  );
}
