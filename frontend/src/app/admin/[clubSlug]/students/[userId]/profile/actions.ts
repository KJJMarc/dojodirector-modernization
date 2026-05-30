"use server";

import { redirect } from "next/navigation";
import {
  adminDeleteStudentMembership,
  adminUpdateMembershipRole,
  adminUpdateMembershipStatus,
} from "@/lib/admin-student-membership.server";
import { revalidateMembershipAdminPaths } from "@/lib/admin-revalidate.server";
import { clubAdminPath, parseClubSlugFromForm } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

function isInstructorFacingRole(role: string | null | undefined) {
  return role === "instructor" || role === "admin";
}

export async function updateMembershipRoleAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  const { previousRole, nextRole } = await adminUpdateMembershipRole({
    userId,
    clubId: club.id,
    role,
  });

  revalidateMembershipAdminPaths(clubSlug, userId, {
    revalidateInstructors:
      isInstructorFacingRole(previousRole) || isInstructorFacingRole(nextRole),
  });
}

export async function updateMembershipStatusAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");

  await adminUpdateMembershipStatus({
    userId,
    clubId: club.id,
    status,
  });

  revalidateMembershipAdminPaths(clubSlug, userId);
}

export async function deleteStudentAction(formData: FormData) {
  const clubSlug = parseClubSlugFromForm(formData);
  const club = await requireClubBySlug(clubSlug);
  const userId = String(formData.get("userId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  await adminDeleteStudentMembership({
    userId,
    clubId: club.id,
    confirmation,
  });

  revalidateMembershipAdminPaths(clubSlug, userId);
  redirect(clubAdminPath(clubSlug, "students"));
}
