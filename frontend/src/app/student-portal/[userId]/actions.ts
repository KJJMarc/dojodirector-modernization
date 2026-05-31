"use server";

import { bookClassSessionForUser } from "@/lib/member-booking.server";
import { getStudentClubContextForAttendance } from "@/lib/attendance-card-manual.server";

export async function bookClassFromStudentPortal(
  userId: string,
  classSessionId: string,
) {
  const normalizedUserId = userId.trim();
  const normalizedSessionId = classSessionId.trim();

  if (!normalizedUserId) {
    throw new Error("Student account is required.");
  }

  if (!normalizedSessionId) {
    throw new Error("Please choose a class to book.");
  }

  const { clubId } = await getStudentClubContextForAttendance(normalizedUserId);

  return bookClassSessionForUser({
    userId: normalizedUserId,
    classSessionId: normalizedSessionId,
    clubId,
  });
}
