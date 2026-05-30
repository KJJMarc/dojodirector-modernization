"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminStudent } from "@/lib/admin-create-student.server";
import type { CreateAdminStudentInput } from "@/lib/admin-create-student.shared";

function revalidateStudentPaths(userId: string) {
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${userId}/profile`);
}

export async function createAdminStudentAction(formData: FormData) {
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

  const { userId } = await createAdminStudent(input);

  revalidateStudentPaths(userId);
  redirect(`/admin/students/${userId}/profile`);
}
