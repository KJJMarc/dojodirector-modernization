"use server";

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
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { revalidatePath } from "next/cache";

export async function createAdminStudentAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const programmeSlug = String(formData.get("programmeSlug") ?? "").trim() || undefined;
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

  const programmeMembershipTypes = parseProgrammeMembershipTypes(
    formData.getAll("programmeMembershipTypes").map(String),
  );
  const bookingAccessTypes = parseBookingAccessProgrammeTypes(
    formData.getAll("bookingAccessTypes").map(String),
  );

  const { userId } = await createAdminStudent(input, club.id, {
    programmeSlug,
    programmeMembershipTypes,
    bookingAccessTypes,
  });

  revalidateStudentAdminPaths(clubSlug, userId);

  if (programmeSlug) {
    revalidatePath(programmeStudentsAdminPath(clubSlug, programmeSlug));
    revalidatePath(clubProgrammeStudentAreasPath(clubSlug));
    redirect(programmeStudentsAdminPath(clubSlug, programmeSlug));
  }

  redirect(clubAdminPath(clubSlug, `students/${userId}/profile`));
}
