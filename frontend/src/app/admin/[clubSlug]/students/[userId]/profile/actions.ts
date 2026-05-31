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
import {
  sendInstructorPortalInvite,
  setInstructorPortalPassword,
  updateInstructorPortalLoginEmail,
} from "@/lib/instructor-portal-auth.server";
import {
  sendStudentPortalInvite,
  setStudentPortalPassword,
} from "@/lib/student-portal-auth.server";
import { revalidatePath } from "next/cache";
import {
  clearAdminAccessLogin,
  requireAdminAccessForClubSlug,
  setAdminAccessPassword,
} from "@/lib/admin-auth.server";

function isInstructorFacingRole(role: string | null | undefined) {
  return role === "instructor" || role === "admin";
}

export async function setAdminAccessPasswordAction(
  clubSlug: string,
  userId: string,
  formData: FormData,
) {
  await requireAdminAccessForClubSlug(clubSlug);

  const { hadAuthLogin } = await setAdminAccessPassword({
    userId,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return {
    message: hadAuthLogin
      ? "Admin dashboard password updated."
      : "Admin login created and password set.",
  };
}

export async function clearAdminAccessLoginAction(clubSlug: string, userId: string) {
  await requireAdminAccessForClubSlug(clubSlug);

  await clearAdminAccessLogin(userId);

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return {
    message: "Admin login link cleared from this profile.",
  };
}

export async function sendStudentPortalInviteAction(clubSlug: string, userId: string) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  const result = await sendStudentPortalInvite({
    userId,
    clubId: club.id,
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return result;
}

export async function setStudentPortalPasswordAction(
  clubSlug: string,
  userId: string,
  formData: FormData,
) {
  await requireClubBySlug(clubSlug);

  await setStudentPortalPassword({
    userId,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return {
    message: "Student portal password updated.",
  };
}

export async function sendInstructorPortalInviteAction(clubSlug: string, userId: string) {
  const club = await requireClubBySlug(clubSlug);

  const result = await sendInstructorPortalInvite({
    userId,
    clubId: club.id,
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return result;
}

export async function setInstructorPortalPasswordAction(
  clubSlug: string,
  userId: string,
  formData: FormData,
) {
  await requireClubBySlug(clubSlug);

  await setInstructorPortalPassword({
    userId,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return {
    message: "Instructor portal password updated.",
  };
}

export async function updateInstructorPortalLoginEmailAction(
  clubSlug: string,
  userId: string,
  formData: FormData,
) {
  await requireClubBySlug(clubSlug);

  const result = await updateInstructorPortalLoginEmail({
    userId,
    loginEmail: String(formData.get("loginEmail") ?? ""),
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return {
    message: `Instructor portal login email saved as ${result.loginEmail}.`,
  };
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
