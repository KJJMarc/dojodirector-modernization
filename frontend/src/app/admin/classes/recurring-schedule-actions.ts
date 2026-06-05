"use server";

import { revalidatePath } from "next/cache";
import {
  deactivateRecurringClassSchedule,
  reactivateRecurringClassSchedule,
} from "@/lib/admin-recurring-classes.server";
import {
  adminBlockBookRecurringSchedule,
  adminCancelRecurringScheduleBookings,
  getRecurringScheduleBookedStudentOptions,
} from "@/lib/admin-session-bookings.server";
import type {
  BlockBookingResult,
  CancelRecurringBookingResult,
} from "@/lib/admin-session-bookings.shared";

function revalidateRecurringClassPaths(scheduleId?: string, userId?: string) {
  revalidatePath("/admin/classes");
  revalidatePath("/book");
  revalidatePath("/attendance");

  if (scheduleId) {
    revalidatePath(`/admin/classes/recurring/${scheduleId}/bookings`);
  }

  if (userId) {
    revalidatePath(`/students/${userId}/attendance-card`);
  }
}

export async function deactivateRecurringClassAction(formData: FormData) {
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring class id.");
  }

  await deactivateRecurringClassSchedule(scheduleId);
  revalidateRecurringClassPaths(scheduleId);
}

export async function reactivateRecurringClassAction(formData: FormData) {
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring class id.");
  }

  await reactivateRecurringClassSchedule(scheduleId);
  revalidateRecurringClassPaths(scheduleId);
}

export async function blockBookRecurringScheduleAction(
  formData: FormData,
): Promise<BlockBookingResult> {
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
    throw new Error("Please choose a book until date.");
  }

  const result = await adminBlockBookRecurringSchedule({
    scheduleId,
    userId,
    endDate,
  });

  revalidateRecurringClassPaths(scheduleId, userId);

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

  revalidateRecurringClassPaths(scheduleId, userId);

  return result;
}
