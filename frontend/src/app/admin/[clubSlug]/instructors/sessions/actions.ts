"use server";

import { adminAssignInstructorToClassSession } from "@/lib/admin-instructors.server";
import { revalidateInstructorAdminPaths } from "@/lib/admin-revalidate.server";
import { parseClubSlugFromForm } from "@/lib/clubs.shared";

export async function assignInstructorToClassSessionAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
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

  revalidateInstructorAdminPaths(clubSlug);
}
