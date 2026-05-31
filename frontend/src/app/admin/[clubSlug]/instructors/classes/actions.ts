"use server";

import {
  adminAssignInstructorToRecurringSchedule,
  adminDeactivateInstructorAssignment,
} from "@/lib/admin-instructors.server";
import { revalidateInstructorAdminPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function assignInstructorToRecurringScheduleAction(
  formData: FormData,
) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const instructorUserId = String(formData.get("instructorUserId") ?? "");
  const recurringScheduleId = String(formData.get("recurringScheduleId") ?? "");

  if (!instructorUserId) {
    throw new Error("Please select an instructor.");
  }

  if (!recurringScheduleId) {
    throw new Error("Please select a recurring class.");
  }

  await adminAssignInstructorToRecurringSchedule({
    instructorUserId,
    recurringScheduleId,
    clubId: club.id,
  });

  revalidateInstructorAdminPaths(clubSlug);
}

export async function deactivateInstructorAssignmentAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const assignmentId = String(formData.get("assignmentId") ?? "");

  if (!assignmentId) {
    throw new Error("Missing assignment id.");
  }

  await adminDeactivateInstructorAssignment(assignmentId, club.id);
  revalidateInstructorAdminPaths(clubSlug);
}
