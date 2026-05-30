"use server";

import { revalidatePath } from "next/cache";
import {
  adminAddSessionBooking,
  adminCancelSessionBooking,
} from "@/lib/admin-session-bookings.server";

function revalidateSessionBookingPaths(sessionId: string, userId?: string) {
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/sessions/${sessionId}`);
  revalidatePath("/book");
  revalidatePath("/attendance");
  revalidatePath(`/attendance/${sessionId}`);

  if (userId) {
    revalidatePath(`/students/${userId}/attendance-card`);
  }
}

export async function addSessionBookingAction(formData: FormData) {
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
  revalidateSessionBookingPaths(sessionId, userId);
}

export async function cancelSessionBookingAction(formData: FormData) {
  const attendeeId = String(formData.get("attendeeId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (!attendeeId) {
    throw new Error("Missing booking id.");
  }

  await adminCancelSessionBooking(attendeeId);
  revalidateSessionBookingPaths(sessionId, userId || undefined);
}
