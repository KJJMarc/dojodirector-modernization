"use server";

import {
  deactivateRecurringClassSchedule,
  deleteRecurringClassSchedulePermanently,
  formatRecurringSessionCapacitySyncSummary,
  getRecurringClassScheduleById,
  reactivateRecurringClassSchedule,
  updateRecurringClassSchedule,
} from "@/lib/admin-recurring-classes.server";
import { parseUpdateRecurringClassInput } from "@/lib/admin-recurring-classes.input";
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
import { requireClubBySlug } from "@/lib/clubs.server";

async function requireScheduleForClub(scheduleId: string, clubId: string) {
  const schedule = await getRecurringClassScheduleById(scheduleId, clubId);

  if (!schedule) {
    throw new Error("Recurring class schedule not found.");
  }

  return schedule;
}

export async function deactivateRecurringClassAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring class id.");
  }

  await requireScheduleForClub(scheduleId, club.id);
  await deactivateRecurringClassSchedule(scheduleId);
  revalidateRecurringClassPaths(clubSlug, scheduleId);
}

export async function reactivateRecurringClassAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring class id.");
  }

  await requireScheduleForClub(scheduleId, club.id);
  await reactivateRecurringClassSchedule(scheduleId);
  revalidateRecurringClassPaths(clubSlug, scheduleId);
}

export async function blockBookRecurringScheduleAction(
  formData: FormData,
): Promise<BlockBookingResult> {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
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
    clubId: club.id,
  });

  revalidateRecurringClassPaths(clubSlug, scheduleId, userId);

  return result;
}

export async function getRecurringScheduleBookedStudentOptionsAction(
  scheduleId: string,
  clubSlug: string,
) {
  if (!scheduleId) {
    throw new Error("Missing recurring schedule id.");
  }

  const club = await requireClubBySlug(clubSlug);

  return getRecurringScheduleBookedStudentOptions(scheduleId, club.id);
}

export async function cancelRecurringScheduleBookingsAction(
  formData: FormData,
): Promise<CancelRecurringBookingResult> {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
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
    clubId: club.id,
  });

  revalidateRecurringClassPaths(clubSlug, scheduleId, userId);

  return result;
}

export async function updateRecurringClassAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const input = parseUpdateRecurringClassInput(formData);

  await requireScheduleForClub(input.scheduleId, club.id);
  const sessionSync = await updateRecurringClassSchedule(input, club.id);
  revalidateRecurringClassPaths(clubSlug, input.scheduleId);

  return {
    sessionSyncSummary: formatRecurringSessionCapacitySyncSummary(sessionSync),
  };
}

export async function deleteRecurringClassAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const scheduleId = String(formData.get("scheduleId") ?? "");

  if (!scheduleId) {
    throw new Error("Missing recurring class id.");
  }

  await requireScheduleForClub(scheduleId, club.id);
  await deleteRecurringClassSchedulePermanently(scheduleId, club.id);
  revalidateRecurringClassPaths(clubSlug, scheduleId);
}
