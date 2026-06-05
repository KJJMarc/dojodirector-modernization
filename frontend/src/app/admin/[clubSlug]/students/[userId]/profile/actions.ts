"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
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
  updateInstructorPortalLoginEmail,
} from "@/lib/instructor-portal-auth.server";
import { setProfileLoginPassword } from "@/lib/profile-login-access.server";
import { sendPortalSetupEmailForMember } from "@/lib/portal-setup.server";
import { sendStudentPortalInvite } from "@/lib/student-portal-auth.server";
import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import {
  updateStudentProgrammeBookingAccess,
  updateStudentProgrammeMemberships,
} from "@/lib/admin-programmes.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function isInstructorFacingRole(role: string | null | undefined) {
  return role === "instructor" || role === "admin";
}

async function loadMembershipRoleForUser(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load membership: ${error.message}`);
  }

  return (data as { role: string | null } | null)?.role ?? null;
}

export async function setProfileLoginPasswordAction(
  clubSlug: string,
  userId: string,
  formData: FormData,
) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  const membershipRole = await loadMembershipRoleForUser(userId, club.id);
  const { hadAuthLogin } = await setProfileLoginPassword({
    userId,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    membershipRole,
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return {
    message: hadAuthLogin
      ? "Login password updated."
      : "Login created and password set.",
  };
}

export async function sendPortalSetupEmailAction(clubSlug: string, userId: string) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  const supabase = getSupabaseAdminClient();
  const [{ data: user, error: userError }, { data: membership, error: membershipError }] =
    await Promise.all([
      supabase.from("users").select("email").eq("id", userId).maybeSingle(),
      supabase
        .from("memberships")
        .select("role, status")
        .eq("user_id", userId)
        .eq("club_id", club.id)
        .maybeSingle(),
    ]);

  if (userError) {
    throw new Error(`Failed to load member: ${userError.message}`);
  }

  if (membershipError) {
    throw new Error(`Failed to load membership: ${membershipError.message}`);
  }

  if (!membership) {
    throw new Error("Member not found at this academy.");
  }

  const result = await sendPortalSetupEmailForMember({
    userId,
    clubSlug: club.slug,
    academyName: club.name,
    membershipRole: membership.role,
    membershipStatus: membership.status,
    profileEmail: user?.email ?? null,
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return result;
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

export async function sendInstructorPortalInviteAction(clubSlug: string, userId: string) {
  const club = await requireClubBySlug(clubSlug);

  const result = await sendInstructorPortalInvite({
    userId,
    clubId: club.id,
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return result;
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

export async function updateStudentProgrammeMembershipAction(
  clubSlug: string,
  userId: string,
  programmeIds: string[],
) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  await updateStudentProgrammeMemberships({
    clubId: club.id,
    userId,
    programmeIds,
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));
  revalidatePath(clubAdminPath(clubSlug, "students"));
  revalidatePath(clubAdminPath(clubSlug, "programmes"));
}

export async function updateStudentProgrammeBookingAccessAction(
  clubSlug: string,
  userId: string,
  programmeIds: string[],
) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  await updateStudentProgrammeBookingAccess({
    clubId: club.id,
    userId,
    programmeIds,
  });

  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));
}

/** @deprecated Use updateStudentProgrammeMembershipAction */
export async function updateStudentProgrammeAccessAction(
  clubSlug: string,
  userId: string,
  programmeIds: string[],
) {
  return updateStudentProgrammeMembershipAction(clubSlug, userId, programmeIds);
}

export type DeleteStudentActionResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteStudentAction(
  formData: FormData,
): Promise<DeleteStudentActionResult> {
  const clubSlug = parseClubSlugFromForm(formData);

  try {
    await requireAdminAccessForClubSlug(clubSlug);
    const club = await requireClubBySlug(clubSlug);
    const userId = String(formData.get("userId") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    await adminDeleteStudentMembership({
      userId,
      clubId: club.id,
      confirmation,
    });

    revalidateMembershipAdminPaths(clubSlug, userId);

    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[deleteStudentAction] failed", {
      clubSlug,
      userId: String(formData.get("userId") ?? ""),
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to delete student.",
    };
  }
}
