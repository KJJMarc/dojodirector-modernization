import "server-only";

import {
  isSuperAdminMembershipRole,
} from "@/lib/admin-auth.shared";
import {
  LAST_SUPER_ADMIN_BLOCKED_MESSAGE,
  lastSuperAdminWarningMessage,
} from "@/lib/admin-super-admin.shared";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface MembershipRoleStatusRow {
  club_id: string;
  role: string | null;
  status: string | null;
}

function membershipGrantsActiveSuperAdmin(row: {
  role: string | null;
  status: string | null;
}) {
  return (
    isSuperAdminMembershipRole(row.role) &&
    isActiveMembershipStatus(row.status)
  );
}

/** Distinct users with at least one active super_admin membership. */
export async function countActiveSuperAdminUsers(): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("role", "super_admin")
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to count Super Admin users: ${error.message}`);
  }

  return new Set(((data ?? []) as { user_id: string }[]).map((row) => row.user_id))
    .size;
}

export async function userHasActiveSuperAdminMembership(
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .eq("status", "active")
    .limit(1);

  if (error) {
    throw new Error(`Failed to load Super Admin membership: ${error.message}`);
  }

  return (data ?? []).length > 0;
}

export async function resolveLastSuperAdminWarningForUser(
  userId: string,
): Promise<string | null> {
  const [count, isSuperAdmin] = await Promise.all([
    countActiveSuperAdminUsers(),
    userHasActiveSuperAdminMembership(userId),
  ]);

  if (!isSuperAdmin) {
    return null;
  }

  return lastSuperAdminWarningMessage(count);
}

export async function assertSuperAdminMembershipChangeAllowed(input: {
  userId: string;
  clubId: string;
  nextRole?: string;
  nextStatus?: string;
  deleteMembership?: boolean;
}) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status")
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Failed to load memberships: ${error.message}`);
  }

  const rows = (data ?? []) as MembershipRoleStatusRow[];
  const target = rows.find((row) => row.club_id === input.clubId);

  if (!target || !isSuperAdminMembershipRole(target.role)) {
    return;
  }

  const simulatedRows = rows
    .map((row) => {
      if (row.club_id !== input.clubId) {
        return row;
      }

      if (input.deleteMembership) {
        return null;
      }

      return {
        club_id: row.club_id,
        role: input.nextRole ?? row.role,
        status: input.nextStatus ?? row.status,
      };
    })
    .filter((row): row is MembershipRoleStatusRow => row !== null);

  const stillActiveSuperAdmin = simulatedRows.some(membershipGrantsActiveSuperAdmin);

  if (stillActiveSuperAdmin) {
    return;
  }

  const activeSuperAdminCount = await countActiveSuperAdminUsers();

  if (activeSuperAdminCount <= 1) {
    throw new Error(LAST_SUPER_ADMIN_BLOCKED_MESSAGE);
  }
}
