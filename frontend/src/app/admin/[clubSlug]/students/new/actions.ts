"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";
import { revalidateStudentAdminPaths } from "@/lib/admin-revalidate.server";
import { createAdminStudent } from "@/lib/admin-create-student.server";
import type { CreateAdminStudentInput } from "@/lib/admin-create-student.shared";
import {
  clubProgrammeStudentAreasPath,
  parseBookingAccessProgrammeTypes,
  parseProgrammeMembershipTypes,
  programmeStudentsAdminPath,
} from "@/lib/admin-programmes.shared";
import {
  ADMIN_STUDENT_FORM_INITIAL_STATE,
  mapAdminStudentSaveFailure,
  toAdminStudentSaveErrorState,
  type AdminStudentSaveActionState,
} from "@/lib/admin-student-form.shared";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { revalidatePath } from "next/cache";

export async function createAdminStudentAction(
  _previousState: AdminStudentSaveActionState | null,
  formData: FormData,
): Promise<AdminStudentSaveActionState | null> {
  const clubSlug = parseClubSlugFromForm(formData);
  const programmeSlug = String(formData.get("programmeSlug") ?? "").trim() || undefined;

  try {
    const club = await requireClubBySlug(clubSlug);
    const input: CreateAdminStudentInput = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      adminNotes: String(formData.get("adminNotes") ?? ""),
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

    const result = await createAdminStudent(input, club.id, {
      programmeSlug,
      programmeMembershipTypes,
      bookingAccessTypes,
    });

    if (!result.ok) {
      return {
        ok: false,
        alert: mapAdminStudentSaveFailure(result.failure),
      };
    }

    revalidateStudentAdminPaths(clubSlug, result.userId);

    if (programmeSlug) {
      revalidatePath(programmeStudentsAdminPath(clubSlug, programmeSlug));
      revalidatePath(clubProgrammeStudentAreasPath(clubSlug));
      redirect(programmeStudentsAdminPath(clubSlug, programmeSlug));
    }

    redirect(clubAdminPath(clubSlug, `students/${result.userId}/profile`));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[createAdminStudentAction] failed", {
      clubSlug,
      message: error instanceof Error ? error.message : String(error),
    });

    return toAdminStudentSaveErrorState(error);
  }

  return ADMIN_STUDENT_FORM_INITIAL_STATE;
}
