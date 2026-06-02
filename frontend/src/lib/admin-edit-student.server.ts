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
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type { AdminStudentEditPageData, EditAdminStudentInput };

const USER_EDIT_COLUMNS =
  "id, first_name, last_name, email, phone, date_of_birth, notes";

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

async function findOtherUserIdByEmail(email: string, excludeUserId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .ilike("email", email)
    .neq("id", excludeUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify email: ${error.message}`);
  }

  return data?.id ?? null;
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

  if (userError) {
    throw new Error(`Failed to load student: ${userError.message}`);
  }

  if (!user) {
    throw new Error("Student not found.");
  }

  const membershipRole = membership.role ?? "student";
  const membershipStatus =
    parseProfileMembershipStatusValue(membership.status ?? "active") ?? "active";

  return {
    userId: user.id,
    firstName: user.first_name?.trim() ?? "",
    lastName: user.last_name?.trim() ?? "",
    email: user.email?.trim() ?? "",
    phone: user.phone?.trim() ?? "",
    dateOfBirth: user.date_of_birth ?? "",
    address,
    notes: user.notes?.trim() ?? "",
    membershipRole,
    membershipStatus,
    canChangeRole: canChangeProfileMembershipRole(membership.role),
  };
}

export async function updateAdminStudentDetails(
  rawInput: EditAdminStudentInput,
  clubId: string,
): Promise<{ previousRole: string | null; nextRole: string | null }> {
  const userFields = parseEditAdminStudentUserFields(rawInput);
  const membership = await loadMembershipForClub(userFields.userId, clubId);
  const canChangeRole = canChangeProfileMembershipRole(membership.role);

  const duplicateUserId = await findOtherUserIdByEmail(
    userFields.email,
    userFields.userId,
  );

  if (duplicateUserId) {
    throw new Error("Another student already uses this email address.");
  }

  const supabase = getSupabaseAdminClient();

  const { error: userError } = await supabase
    .from("users")
    .update({
      first_name: userFields.firstName,
      last_name: userFields.lastName,
      email: userFields.email,
      phone: userFields.phone,
      date_of_birth: userFields.dateOfBirth,
      notes: userFields.notes,
    })
    .eq("id", userFields.userId);

  if (userError) {
    throw new Error(`Unable to update student: ${userError.message}`);
  }

  await saveUserAddressOnUsers(userFields.userId, userFields.address);

  if (!canChangeRole) {
    return { previousRole: membership.role, nextRole: membership.role };
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

  return { previousRole, nextRole };
}
