"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminInstructor } from "@/lib/admin-create-instructor.server";
import type { CreateAdminInstructorInput } from "@/lib/admin-create-instructor.server";

export async function createAdminInstructorAction(formData: FormData) {
  const input: CreateAdminInstructorInput = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    role: String(formData.get("role") ?? "instructor") as CreateAdminInstructorInput["role"],
    promoteExistingMember: formData.get("promoteExistingMember") === "true",
  };

  await createAdminInstructor(input);

  revalidatePath("/admin/instructors");
  redirect("/admin/instructors");
}
