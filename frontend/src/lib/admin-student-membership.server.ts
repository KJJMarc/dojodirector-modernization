import "server-only";

import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  STUDENT_DELETE_CONFIRMATION_TEXT,
  canChangeProfileMembershipRole,
  canDeleteStudentMembership,
  isProfileMembershipRoleValue,
  parseProfileMembershipStatusValue,
} from "@/lib/admin-student-membership.shared";
import { assertSuperAdminMembershipChangeAllowed } from "@/lib/admin-super-admin.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface MembershipManagementRow {
  role: string | null;
  status: string | null;
}

async function loadMembershipForManagement(
  userId: string,
  clubId: string,
): Promise<MembershipManagementRow> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("role, status")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("Student not found.");
  }

  return data as MembershipManagementRow;
}

function assertCanChangeRole(currentRole: string | null) {
  if (!canChangeProfileMembershipRole(currentRole)) {
    throw new Error("This membership role cannot be changed from the profile page.");
  }
}

function assertCanDelete(currentRole: string | null) {
  if (!canDeleteStudentMembership(currentRole)) {
    throw new Error(
      "Change this member back to student before deleting.",
    );
  }
}

async function deleteSessionAttendeesForClubUser(
  userId: string,
  clubId: string,
) {
  const supabase = getSupabaseAdminClient();

  const { data: sessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("club_id", clubId);

  if (sessionsError) {
    throw new Error(
      `Unable to load class sessions for deletion: ${sessionsError.message}`,
    );
  }

  const sessionIds = (sessions ?? []).map((session) => session.id);

  if (sessionIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("session_attendees")
    .delete()
    .eq("user_id", userId)
    .in("class_session_id", sessionIds);

  if (error) {
    throw new Error(`Unable to delete session bookings: ${error.message}`);
  }
}

export async function adminUpdateMembershipRole(input: {
  userId: string;
  clubId?: string;
  role: string;
}) {
  const clubId = input.clubId ?? ACTIVE_CLUB_ID;

  if (!input.userId) {
    throw new Error("Missing student id.");
  }

  if (!isProfileMembershipRoleValue(input.role)) {
    throw new Error("Please select a valid role.");
  }

  const membership = await loadMembershipForManagement(input.userId, clubId);
  assertCanChangeRole(membership.role);

  await assertSuperAdminMembershipChangeAllowed({
    userId: input.userId,
    clubId,
    nextRole: input.role,
  });

  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("memberships")
    .update({ role: input.role })
    .eq("user_id", input.userId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Unable to update role: ${error.message}`);
  }

  return {
    previousRole: membership.role,
    nextRole: input.role,
  };
}

export async function adminUpdateMembershipStatus(input: {
  userId: string;
  clubId?: string;
  status: string;
}) {
  const clubId = input.clubId ?? ACTIVE_CLUB_ID;

  if (!input.userId) {
    throw new Error("Missing student id.");
  }

  const status = parseProfileMembershipStatusValue(input.status);

  if (!status) {
    throw new Error("Please select a valid membership status.");
  }

  const membership = await loadMembershipForManagement(input.userId, clubId);
  assertCanChangeRole(membership.role);

  await assertSuperAdminMembershipChangeAllowed({
    userId: input.userId,
    clubId,
    nextStatus: status,
  });

  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("memberships")
    .update({ status })
    .eq("user_id", input.userId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Unable to update membership status: ${error.message}`);
  }
}

export async function adminDeleteStudentMembership(input: {
  userId: string;
  clubId?: string;
  confirmation: string;
}) {
  const clubId = input.clubId ?? ACTIVE_CLUB_ID;

  if (!input.userId) {
    throw new Error("Missing student id.");
  }

  if (input.confirmation.trim() !== STUDENT_DELETE_CONFIRMATION_TEXT) {
    throw new Error(`Type ${STUDENT_DELETE_CONFIRMATION_TEXT} to confirm deletion.`);
  }

  const membership = await loadMembershipForManagement(input.userId, clubId);
  assertCanDelete(membership.role);

  await assertSuperAdminMembershipChangeAllowed({
    userId: input.userId,
    clubId,
    deleteMembership: true,
  });

  const supabase = getSupabaseAdminClient();

  await deleteSessionAttendeesForClubUser(input.userId, clubId);

  const { error: attendanceError } = await supabase
    .from("attendance_records")
    .delete()
    .eq("user_id", input.userId)
    .eq("club_id", clubId);

  if (attendanceError) {
    throw new Error(
      `Unable to delete attendance records: ${attendanceError.message}`,
    );
  }

  const { error: gradeAwardsError } = await supabase
    .from("grade_awards")
    .delete()
    .eq("user_id", input.userId)
    .eq("club_id", clubId);

  if (gradeAwardsError) {
    throw new Error(`Unable to delete grade awards: ${gradeAwardsError.message}`);
  }

  const { error: membershipError } = await supabase
    .from("memberships")
    .delete()
    .eq("user_id", input.userId)
    .eq("club_id", clubId);

  if (membershipError) {
    throw new Error(`Unable to delete membership: ${membershipError.message}`);
  }

  const { count, error: countError } = await supabase
    .from("memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", input.userId);

  if (countError) {
    throw new Error(
      `Unable to verify remaining memberships: ${countError.message}`,
    );
  }

  if ((count ?? 0) === 0) {
    const { error: userError } = await supabase
      .from("users")
      .delete()
      .eq("id", input.userId);

    if (userError) {
      throw new Error(`Unable to delete user: ${userError.message}`);
    }
  }
}
