"use server";

import { redirect } from "next/navigation";
import { revalidateStudentAdminPaths } from "@/lib/admin-revalidate.server";
import { createAdminStudent } from "@/lib/admin-create-student.server";
import type { CreateAdminStudentInput } from "@/lib/admin-create-student.shared";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function createAdminStudentAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const input: CreateAdminStudentInput = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    role: String(formData.get("role") ?? "student") as CreateAdminStudentInput["role"],
    membershipStatus: String(
      formData.get("membershipStatus") ?? "active",
    ) as CreateAdminStudentInput["membershipStatus"],
  };

  const { userId } = await createAdminStudent(input, club.id);

  revalidateStudentAdminPaths(clubSlug, userId);
  redirect(clubAdminPath(clubSlug, `students/${userId}/profile`));
}
