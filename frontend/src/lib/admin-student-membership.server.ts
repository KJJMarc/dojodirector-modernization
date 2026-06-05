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
import { syncInstructorPortalAccessAfterMembershipChange } from "@/lib/instructor-portal-membership-sync.server";
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

  const { data: rows, error: selectError } = await supabase
    .from("session_attendees")
    .select("id, class_sessions!inner(club_id)")
    .eq("user_id", userId)
    .eq("class_sessions.club_id", clubId);

  let attendeeIds: string[] = [];

  if (selectError) {
    const { data: attendees, error: attendeesError } = await supabase
      .from("session_attendees")
      .select("id, class_session_id")
      .eq("user_id", userId);

    if (attendeesError) {
      throw new Error(`Unable to load session bookings: ${attendeesError.message}`);
    }

    if (!attendees?.length) {
      return;
    }

    const sessionIds = Array.from(
      new Set(attendees.map((row) => row.class_session_id as string)),
    );
    const clubSessionIds = new Set<string>();

    for (let index = 0; index < sessionIds.length; index += 100) {
      const batch = sessionIds.slice(index, index + 100);
      const { data: sessions, error: sessionsError } = await supabase
        .from("class_sessions")
        .select("id")
        .in("id", batch)
        .eq("club_id", clubId);

      if (sessionsError) {
        throw new Error(`Unable to load session bookings: ${sessionsError.message}`);
      }

      for (const session of sessions ?? []) {
        clubSessionIds.add(session.id as string);
      }
    }

    attendeeIds = attendees
      .filter((row) => clubSessionIds.has(row.class_session_id as string))
      .map((row) => row.id as string);
  } else {
    attendeeIds = (rows ?? []).map((row) => row.id as string);
  }

  if (attendeeIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("session_attendees")
    .delete()
    .in("id", attendeeIds);

  if (error) {
    throw new Error(`Unable to delete session bookings: ${error.message}`);
  }
}

async function deleteSessionWaitlistForClubUser(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("session_waitlist")
    .delete()
    .eq("user_id", userId)
    .eq("club_id", clubId);

  if (!error) {
    return;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("permission denied") ||
    message.includes("session_waitlist")
  ) {
    console.warn(
      "Skipped session_waitlist cleanup during student delete:",
      error.message,
    );
    return;
  }

  throw new Error(`Unable to delete session waitlist entries: ${error.message}`);
}

async function deleteLeadsForClubUser(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("email, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    throw new Error(`Unable to load student email: ${userError.message}`);
  }

  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    return;
  }

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("academy_id", clubId)
    .ilike("email", email);

  if (!error) {
    return;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("leads") &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find"))
  ) {
    return;
  }

  throw new Error(`Unable to delete trial leads: ${error.message}`);
}

async function deleteProgrammeAccessForClubUser(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: programmes, error: programmesError } = await supabase
    .from("programmes")
    .select("id")
    .eq("club_id", clubId);

  if (programmesError) {
    throw new Error(
      `Unable to load club programmes for deletion: ${programmesError.message}`,
    );
  }

  const programmeIds = (programmes ?? []).map((programme) => programme.id as string);

  if (programmeIds.length === 0) {
    return;
  }

  const [membershipsResult, bookingAccessResult] = await Promise.all([
    supabase
      .from("programme_memberships")
      .delete()
      .eq("user_id", userId)
      .in("programme_id", programmeIds),
    supabase
      .from("programme_booking_access")
      .delete()
      .eq("user_id", userId)
      .in("programme_id", programmeIds),
  ]);

  if (membershipsResult.error) {
    throw new Error(
      `Unable to delete programme memberships: ${membershipsResult.error.message}`,
    );
  }

  if (bookingAccessResult.error) {
    throw new Error(
      `Unable to delete programme booking access: ${bookingAccessResult.error.message}`,
    );
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

  await syncInstructorPortalAccessAfterMembershipChange(input.userId);

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

  await syncInstructorPortalAccessAfterMembershipChange(input.userId);
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
  await deleteSessionWaitlistForClubUser(input.userId, clubId);
  await deleteProgrammeAccessForClubUser(input.userId, clubId);
  await deleteLeadsForClubUser(input.userId, clubId);

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

  await syncInstructorPortalAccessAfterMembershipChange(input.userId);

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
