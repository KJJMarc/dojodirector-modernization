import "server-only";

import { getStudentClubContextForAttendance } from "@/lib/attendance-card-manual.server";
import {
  isActiveMembershipStatus,
  STUDENT_PORTAL_INACTIVE_MEMBERSHIP_MESSAGE,
} from "@/lib/membership-status.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type MembershipAccessResult =
  | { allowed: true }
  | { allowed: false; message: string };

export async function loadMembershipStatusForUser(
  userId: string,
  clubId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("status")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load membership status: ${error.message}`);
  }

  return (data as { status: string | null } | null)?.status ?? null;
}

export async function loadMembershipStatusesByUserId(
  userIds: string[],
  clubId: string,
): Promise<Map<string, string | null>> {
  const statuses = new Map<string, string | null>();

  if (userIds.length === 0) {
    return statuses;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, status")
    .eq("club_id", clubId)
    .in("user_id", userIds);

  if (error) {
    throw new Error(`Failed to load membership statuses: ${error.message}`);
  }

  for (const row of (data ?? []) as { user_id: string; status: string | null }[]) {
    statuses.set(row.user_id, row.status);
  }

  return statuses;
}

export async function assertActiveMembershipForStudentPortal(
  userId: string,
  clubId?: string,
): Promise<MembershipAccessResult> {
  const resolvedClubId =
    clubId ?? (await getStudentClubContextForAttendance(userId)).clubId;
  const status = await loadMembershipStatusForUser(userId, resolvedClubId);

  if (isActiveMembershipStatus(status)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: STUDENT_PORTAL_INACTIVE_MEMBERSHIP_MESSAGE,
  };
}

export async function assertActiveMembershipForBooking(
  userId: string,
  clubId: string,
): Promise<MembershipAccessResult> {
  const status = await loadMembershipStatusForUser(userId, clubId);

  if (isActiveMembershipStatus(status)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: STUDENT_PORTAL_INACTIVE_MEMBERSHIP_MESSAGE,
  };
}
