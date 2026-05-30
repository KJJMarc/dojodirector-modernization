"use server";

import {
  deactivateRecurringClassSchedule,
  reactivateRecurringClassSchedule,
} from "@/lib/admin-recurring-classes.server";
import { revalidateRecurringClassPaths } from "@/lib/admin-revalidate.server";
import {
  adminBlockBookRecurringSchedule,
  adminCancelRecurringScheduleBookings,
  getRecurringScheduleBookedStudentOptions,
} from "@/lib/admin-session-bookings.server";
import type {
  BlockBookingResult,
  CancelRecurringBookingResult,
} from "@/lib/admin-session-bookings.shared";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";

export async function deactivateRecurringClassAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring class id.");
  }

  await deactivateRecurringClassSchedule(scheduleId);
  revalidateRecurringClassPaths(clubSlug, scheduleId);
}

export async function reactivateRecurringClassAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring class id.");
  }

  await reactivateRecurringClassSchedule(scheduleId);
  revalidateRecurringClassPaths(clubSlug, scheduleId);
}

export async function blockBookRecurringScheduleAction(
  formData: FormData,
): Promise<BlockBookingResult> {
  const clubSlug = parseClubSlugFromForm(formData);
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring schedule id.");
  }

  if (!userId) {
    throw new Error("Please select a student.");
  }

  if (!endDate) {
    throw new Error("Please choose an end date.");
  }

  const result = await adminBlockBookRecurringSchedule({
    scheduleId,
    userId,
    endDate,
  });

  revalidateRecurringClassPaths(clubSlug, scheduleId, userId);

  return result;
}

export async function getRecurringScheduleBookedStudentOptionsAction(
  scheduleId: string,
) {
  if (!scheduleId) {
    throw new Error("Missing recurring schedule id.");
  }

  return getRecurringScheduleBookedStudentOptions(scheduleId);
}

export async function cancelRecurringScheduleBookingsAction(
  formData: FormData,
): Promise<CancelRecurringBookingResult> {
  const clubSlug = parseClubSlugFromForm(formData);
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring schedule id.");
  }

  if (!userId) {
    throw new Error("Please select a student.");
  }

  const result = await adminCancelRecurringScheduleBookings({
    scheduleId,
    userId,
  });

  revalidateRecurringClassPaths(clubSlug, scheduleId, userId);

  return result;
}
