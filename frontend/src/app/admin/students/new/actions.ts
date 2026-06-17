"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminStudent } from "@/lib/admin-create-student.server";
import type { CreateAdminStudentInput } from "@/lib/admin-create-student.shared";
import {
  mapAdminStudentSaveError,
  type AdminStudentSaveActionResult,
} from "@/lib/admin-student-form.shared";
import {
  parseBookingAccessProgrammeTypes,
  parseProgrammeMembershipTypes,
} from "@/lib/admin-programmes.shared";

function revalidateStudentPaths(userId: string) {
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${userId}/profile`);
}

export async function createAdminStudentAction(
  formData: FormData,
): Promise<AdminStudentSaveActionResult | void> {
  try {
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

    const programmeMembershipTypes = parseProgrammeMembershipTypes(
      formData.getAll("programmeMembershipTypes").map(String),
    );
    const bookingAccessTypes = parseBookingAccessProgrammeTypes(
      formData.getAll("bookingAccessTypes").map(String),
    );

    const { userId } = await createAdminStudent(input, undefined, {
      programmeMembershipTypes,
      bookingAccessTypes,
    });

    revalidateStudentPaths(userId);
    redirect(`/admin/students/${userId}/profile`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[createAdminStudentAction] failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      alert: mapAdminStudentSaveError(error),
    };
  }
}
