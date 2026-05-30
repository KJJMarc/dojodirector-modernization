"use server";

import { revalidatePath } from "next/cache";
import {
  adminAssignInstructorToRecurringSchedule,
  adminDeactivateInstructorAssignment,
} from "@/lib/admin-instructors.server";

function revalidateInstructorPaths() {
  revalidatePath("/admin/instructors");
  revalidatePath("/admin/instructors/classes");
  revalidatePath("/admin/instructors/sessions");
}

export async function assignInstructorToRecurringScheduleAction(
  formData: FormData,
) {
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

  revalidateInstructorPaths();
}

export async function deactivateInstructorAssignmentAction(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "");

  if (!assignmentId) {
    throw new Error("Missing assignment id.");
  }

  await adminDeactivateInstructorAssignment(assignmentId);
  revalidateInstructorPaths();
}
