"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";
import { updateAdminStudentDetails } from "@/lib/admin-edit-student.server";
import type { EditAdminStudentInput } from "@/lib/admin-edit-student.shared";
import {
  ADMIN_STUDENT_FORM_INITIAL_STATE,
  mapAdminStudentSaveFailure,
  toAdminStudentSaveErrorState,
  type AdminStudentSaveActionState,
} from "@/lib/admin-student-form.shared";
import { revalidateMembershipAdminPaths } from "@/lib/admin-revalidate.server";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

function isInstructorFacingRole(role: string | null | undefined) {
  return role === "instructor" || role === "admin";
}

export async function updateAdminStudentAction(
  _previousState: AdminStudentSaveActionState | null,
  formData: FormData,
): Promise<AdminStudentSaveActionState | null> {
  const clubSlug = parseClubSlugFromForm(formData);
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const membershipStatus = String(formData.get("membershipStatus") ?? "");

  try {
    if (!userId) {
      throw new Error("Missing student id.");
    }

    const club = await requireClubBySlug(clubSlug);
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

    const result = await updateAdminStudentDetails(input, club.id);

    if (!result.ok) {
      return {
        ok: false,
        alert: mapAdminStudentSaveFailure(result.failure),
      };
    }

    revalidateMembershipAdminPaths(clubSlug, userId, {
      revalidateInstructors:
        isInstructorFacingRole(result.previousRole) ||
        isInstructorFacingRole(result.nextRole),
    });

    redirect(clubAdminPath(clubSlug, `students/${userId}/profile`));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[updateAdminStudentAction] failed", {
      clubSlug,
      userId,
      message: error instanceof Error ? error.message : String(error),
    });

    return toAdminStudentSaveErrorState(error);
  }

  return ADMIN_STUDENT_FORM_INITIAL_STATE;
}
