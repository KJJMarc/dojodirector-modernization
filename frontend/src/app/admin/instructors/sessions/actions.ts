"use server";

import { revalidatePath } from "next/cache";
import { adminAssignInstructorToClassSession } from "@/lib/admin-instructors.server";

function revalidateInstructorSessionPaths() {
  revalidatePath("/admin/instructors");
  revalidatePath("/admin/instructors/classes");
  revalidatePath("/admin/instructors/sessions");
}

export async function assignInstructorToClassSessionAction(formData: FormData) {
  const instructorUserId = String(formData.get("instructorUserId") ?? "");
  const classSessionId = String(formData.get("classSessionId") ?? "");

  if (!instructorUserId) {
    throw new Error("Please select an instructor.");
  }

  if (!classSessionId) {
    throw new Error("Missing class session id.");
  }

  await adminAssignInstructorToClassSession({
    instructorUserId,
    classSessionId,
  });

  revalidateInstructorSessionPaths();
}
