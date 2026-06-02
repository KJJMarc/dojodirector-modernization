"use server";

import {
  bookClassSessionForUser,
  cancelClassSessionBookingForUser,
} from "@/lib/member-booking.server";
import { requireStudentPortalClubAccess } from "@/lib/student-portal-club.server";

export async function bookClassFromStudentPortal(
  clubSlug: string,
  userId: string,
  classSessionId: string,
) {
  const normalizedUserId = userId.trim();
  const normalizedSessionId = classSessionId.trim();
  const normalizedClubSlug = clubSlug.trim();

  if (!normalizedUserId) {
    throw new Error("Student account is required.");
  }

  if (!normalizedSessionId) {
    throw new Error("Please choose a class to book.");
  }

  if (!normalizedClubSlug) {
    throw new Error("Academy is required.");
  }

  const club = await requireStudentPortalClubAccess(normalizedUserId, normalizedClubSlug);

  return bookClassSessionForUser({
    userId: normalizedUserId,
    classSessionId: normalizedSessionId,
    clubId: club.id,
  });
}

export async function cancelClassBookingFromStudentPortal(
  clubSlug: string,
  userId: string,
  classSessionId: string,
) {
  const normalizedUserId = userId.trim();
  const normalizedSessionId = classSessionId.trim();
  const normalizedClubSlug = clubSlug.trim();

  if (!normalizedUserId) {
    throw new Error("Student account is required.");
  }

  if (!normalizedSessionId) {
    throw new Error("Please choose a class to cancel.");
  }

  if (!normalizedClubSlug) {
    throw new Error("Academy is required.");
  }

  const club = await requireStudentPortalClubAccess(normalizedUserId, normalizedClubSlug);

  return cancelClassSessionBookingForUser({
    userId: normalizedUserId,
    classSessionId: normalizedSessionId,
    clubId: club.id,
  });
}
