"use server";

import { redirect } from "next/navigation";
import { updateAdminStudentDetails } from "@/lib/admin-edit-student.server";
import type { EditAdminStudentInput } from "@/lib/admin-edit-student.shared";
import { revalidateMembershipAdminPaths } from "@/lib/admin-revalidate.server";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

function isInstructorFacingRole(role: string | null | undefined) {
  return role === "instructor" || role === "admin";
}

export async function updateAdminStudentAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const membershipStatus = String(formData.get("membershipStatus") ?? "");

  if (!userId) {
    throw new Error("Missing student id.");
  }

  const input: EditAdminStudentInput = {
    userId,
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    address: String(formData.get("address") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    role,
    membershipStatus,
  };

  const { previousRole, nextRole } = await updateAdminStudentDetails(
    input,
    club.id,
  );

  revalidateMembershipAdminPaths(clubSlug, userId, {
    revalidateInstructors:
      isInstructorFacingRole(previousRole) || isInstructorFacingRole(nextRole),
  });

  redirect(clubAdminPath(clubSlug, `students/${userId}/profile`));
}
