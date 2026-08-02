import "server-only";

import {
  parseEditAdminStudentMembershipFields,
  parseEditAdminStudentUserFields,
  type AdminStudentEditPageData,
  type EditAdminStudentInput,
} from "@/lib/admin-edit-student.shared";
import {
  canChangeProfileMembershipRole,
  parseProfileMembershipStatusValue,
} from "@/lib/admin-student-membership.shared";
import { assertSuperAdminMembershipChangeAllowed } from "@/lib/admin-super-admin.server";
import {
  loadUserAddressFromUsers,
  saveUserAddressOnUsers,
} from "@/lib/user-address-field.server";
import { syncInstructorPortalAccessAfterMembershipChange } from "@/lib/instructor-portal-membership-sync.server";
import type { AdminStudentSaveFailure } from "@/lib/admin-student-form.shared";
import { getStudentProfileEmailAvailability } from "@/lib/admin-student-email.server";
import { StudentEmailAlreadyInUseError } from "@/lib/admin-student-email.shared";
import { syncProfileEmailWithPortalLoginAccess } from "@/lib/portal-auth-user.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type { AdminStudentEditPageData, EditAdminStudentInput };

const USER_EDIT_COLUMNS =
  "id, first_name, last_name, email, phone, date_of_birth, emergency_contact_name, emergency_contact_phone, admin_notes";

async function loadMembershipForClub(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("role, status")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  return data as { role: string | null; status: string | null };
}

export async function getAdminStudentEditPageData(
  userId: string,
  clubId: string,
): Promise<AdminStudentEditPageData> {
  const supabase = getSupabaseAdminClient();

  const [{ data: user, error: userError }, membership, address] = await Promise.all([
    supabase.from("users").select(USER_EDIT_COLUMNS).eq("id", userId).maybeSingle(),
    loadMembershipForClub(userId, clubId),
    loadUserAddressFromUsers(userId),
  ]);

  let resolvedUser = user;

  if (userError?.message?.includes("emergency_contact")) {
    const fallback = await supabase
      .from("users")
      .select("id, first_name, last_name, email, phone, date_of_birth, admin_notes")
      .eq("id", userId)
      .maybeSingle();

    if (fallback.error?.message?.includes("admin_notes")) {
      const notesFallback = await supabase
        .from("users")
        .select("id, first_name, last_name, email, phone, date_of_birth, notes")
        .eq("id", userId)
        .maybeSingle();

      if (notesFallback.error) {
        throw new Error(`Failed to load student: ${notesFallback.error.message}`);
      }

      resolvedUser = notesFallback.data
        ? {
            ...notesFallback.data,
            admin_notes: notesFallback.data.notes,
            emergency_contact_name: null,
            emergency_contact_phone: null,
          }
        : null;
    } else if (fallback.error) {
      throw new Error(`Failed to load student: ${fallback.error.message}`);
    } else {
      resolvedUser = fallback.data
        ? {
            ...fallback.data,
            emergency_contact_name: null,
            emergency_contact_phone: null,
          }
        : null;
    }
  } else if (userError?.message?.includes("admin_notes")) {
    const fallback = await supabase
      .from("users")
      .select("id, first_name, last_name, email, phone, date_of_birth, notes")
      .eq("id", userId)
      .maybeSingle();

    if (fallback.error) {
      throw new Error(`Failed to load student: ${fallback.error.message}`);
    }

    resolvedUser = fallback.data
      ? {
          ...fallback.data,
          admin_notes: fallback.data.notes,
          emergency_contact_name: null,
          emergency_contact_phone: null,
        }
      : null;
  } else if (userError) {
    throw new Error(`Failed to load student: ${userError.message}`);
  }

  if (!resolvedUser) {
    throw new Error("Student not found.");
  }

  const membershipRole = membership.role ?? "student";
  const membershipStatus =
    parseProfileMembershipStatusValue(membership.status ?? "active") ?? "active";

  return {
    userId: resolvedUser.id,
    firstName: resolvedUser.first_name?.trim() ?? "",
    lastName: resolvedUser.last_name?.trim() ?? "",
    email: resolvedUser.email?.trim() ?? "",
    phone: resolvedUser.phone?.trim() ?? "",
    dateOfBirth: resolvedUser.date_of_birth ?? "",
    address,
    emergencyContactName: resolvedUser.emergency_contact_name?.trim() ?? "",
    emergencyContactPhone: resolvedUser.emergency_contact_phone?.trim() ?? "",
    adminNotes: resolvedUser.admin_notes?.trim() ?? "",
    membershipRole,
    membershipStatus,
    canChangeRole: canChangeProfileMembershipRole(membership.role),
  };
}

export type UpdateAdminStudentDetailsResult =
  | { ok: true; previousRole: string | null; nextRole: string | null }
  | { ok: false; failure: AdminStudentSaveFailure };

export async function updateAdminStudentDetails(
  rawInput: EditAdminStudentInput,
  clubId: string,
): Promise<UpdateAdminStudentDetailsResult> {
  const userFields = parseEditAdminStudentUserFields(rawInput);
  const membership = await loadMembershipForClub(userFields.userId, clubId);
  const canChangeRole = canChangeProfileMembershipRole(membership.role);

  const supabase = getSupabaseAdminClient();
  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("email")
    .eq("id", userFields.userId)
    .maybeSingle();

  if (existingUserError) {
    throw new Error(`Failed to load student email: ${existingUserError.message}`);
  }

  const previousProfileEmail = existingUser?.email ?? null;

  const emailAvailability = await getStudentProfileEmailAvailability(
    userFields.email,
    userFields.userId,
  );

  if (emailAvailability === "duplicate") {
    return { ok: false, failure: { code: "duplicate_email" } };
  }

  const { error: userError } = await supabase
    .from("users")
    .update({
      first_name: userFields.firstName,
      last_name: userFields.lastName,
      email: userFields.email,
      phone: userFields.phone,
      date_of_birth: userFields.dateOfBirth,
      emergency_contact_name: userFields.emergencyContactName,
      emergency_contact_phone: userFields.emergencyContactPhone,
      admin_notes: userFields.adminNotes,
    })
    .eq("id", userFields.userId);

  if (userError) {
    if (userError.message?.includes("emergency_contact")) {
      const { error: fallbackError } = await supabase
        .from("users")
        .update({
          first_name: userFields.firstName,
          last_name: userFields.lastName,
          email: userFields.email,
          phone: userFields.phone,
          date_of_birth: userFields.dateOfBirth,
          admin_notes: userFields.adminNotes,
        })
        .eq("id", userFields.userId);

      if (fallbackError) {
        throw new Error(`Unable to update student: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Unable to update student: ${userError.message}`);
    }
  }

  try {
    await syncProfileEmailWithPortalLoginAccess({
      userId: userFields.userId,
      profileEmail: userFields.email ?? "",
      previousProfileEmail,
    });
  } catch (error) {
    if (error instanceof StudentEmailAlreadyInUseError) {
      return { ok: false, failure: { code: "duplicate_email" } };
    }

    throw error;
  }

  await saveUserAddressOnUsers(userFields.userId, userFields.address);

  if (!canChangeRole) {
    return {
      ok: true,
      previousRole: membership.role,
      nextRole: membership.role,
    };
  }

  const membershipFields = parseEditAdminStudentMembershipFields(
    rawInput.role,
    rawInput.membershipStatus,
  );
  const previousRole = membership.role;
  const nextRole = membershipFields.role;

  await assertSuperAdminMembershipChangeAllowed({
    userId: userFields.userId,
    clubId,
    nextRole: membershipFields.role,
    nextStatus: membershipFields.membershipStatus,
  });

  const { error: membershipError } = await supabase
    .from("memberships")
    .update({
      role: membershipFields.role,
      status: membershipFields.membershipStatus,
    })
    .eq("user_id", userFields.userId)
    .eq("club_id", clubId);

  if (membershipError) {
    throw new Error(`Unable to update membership: ${membershipError.message}`);
  }

  await syncInstructorPortalAccessAfterMembershipChange(userFields.userId);

  return { ok: true, previousRole, nextRole };
}
