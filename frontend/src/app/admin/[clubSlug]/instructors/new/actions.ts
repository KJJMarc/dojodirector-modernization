"use server";

import { redirect } from "next/navigation";
import { createAdminInstructor } from "@/lib/admin-create-instructor.server";
import type { CreateAdminInstructorInput } from "@/lib/admin-create-instructor.server";
import { revalidateInstructorAdminPaths } from "@/lib/admin-revalidate.server";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export async function createAdminInstructorAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const input: CreateAdminInstructorInput = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    role: String(formData.get("role") ?? "instructor") as CreateAdminInstructorInput["role"],
    promoteExistingMember: formData.get("promoteExistingMember") === "true",
  };

  await createAdminInstructor(input, club.id);

  revalidateInstructorAdminPaths(clubSlug);
  redirect(clubAdminPath(clubSlug, "instructors"));
}
