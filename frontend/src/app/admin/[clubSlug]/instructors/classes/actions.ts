"use server";

import {
  adminAssignInstructorToRecurringSchedule,
  adminDeactivateInstructorAssignment,
} from "@/lib/admin-instructors.server";
import { revalidateInstructorAdminPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";

export async function assignInstructorToRecurringScheduleAction(
  formData: FormData,
) {
  const clubSlug = parseClubSlugFromForm(formData);
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
  });

  revalidateInstructorAdminPaths(clubSlug);
}

export async function deactivateInstructorAssignmentAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const assignmentId = String(formData.get("assignmentId") ?? "");

  if (!assignmentId) {
    throw new Error("Missing assignment id.");
  }

  await adminDeactivateInstructorAssignment(assignmentId);
  revalidateInstructorAdminPaths(clubSlug);
}
