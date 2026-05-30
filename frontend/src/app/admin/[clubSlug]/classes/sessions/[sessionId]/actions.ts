"use server";

import { revalidateSessionBookingPaths } from "@/lib/admin-revalidate.server";
import {
  adminAddSessionBooking,
  adminCancelSessionBooking,
} from "@/lib/admin-session-bookings.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";

export async function addSessionBookingAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const sessionId = String(formData.get("sessionId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const allowWaitlist = formData.get("allowWaitlist") === "true";

  if (!sessionId) {
    throw new Error("Missing session id.");
  }

  if (!userId) {
    throw new Error("Please select a student.");
  }

  await adminAddSessionBooking(sessionId, userId, { allowWaitlist });
  revalidateSessionBookingPaths(clubSlug, sessionId, userId);
}

export async function cancelSessionBookingAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const attendeeId = String(formData.get("attendeeId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (!attendeeId) {
    throw new Error("Missing booking id.");
  }

  await adminCancelSessionBooking(attendeeId);
  revalidateSessionBookingPaths(clubSlug, sessionId, userId || undefined);
}
