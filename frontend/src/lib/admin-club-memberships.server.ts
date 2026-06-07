import "server-only";

import { isActiveStudentClubMembership } from "@/lib/admin-student-membership.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ClubMembershipRow {
  user_id: string;
  role: string | null;
  status: string | null;
}

export interface ClubMembershipDetailRow extends ClubMembershipRow {
  joined_at: string | null;
}

export interface AdminStudentProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  original_lead_source: string | null;
}

const SUPABASE_PAGE_SIZE = 1000;
const SUPABASE_IN_BATCH_SIZE = 100;

function chunkIds<T>(ids: T[], batchSize = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < ids.length; index += batchSize) {
    chunks.push(ids.slice(index, index + batchSize));
  }

  return chunks;
}

/** All club memberships — same scope as the admin Students list (any role/status). */
export async function loadClubMembershipRows(
  clubId: string,
): Promise<ClubMembershipRow[]> {
  const supabase = getSupabaseAdminClient();
  const membershipRows: ClubMembershipRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("memberships")
      .select("user_id, role, status")
      .eq("club_id", clubId)
      .order("user_id", { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load memberships: ${error.message}`);
    }

    const page = (data ?? []) as ClubMembershipRow[];
    membershipRows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return membershipRows;
}

/** Paginated club memberships including joined_at (all roles/statuses). */
export async function loadClubMembershipDetailRows(
  clubId: string,
): Promise<ClubMembershipDetailRow[]> {
  const supabase = getSupabaseAdminClient();
  const membershipRows: ClubMembershipDetailRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("memberships")
      .select("user_id, role, status, joined_at")
      .eq("club_id", clubId)
      .order("user_id", { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load memberships: ${error.message}`);
    }

    const page = (data ?? []) as ClubMembershipDetailRow[];
    membershipRows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return membershipRows;
}

/** Active student memberships only — used for programme student area counts and lists. */
export async function loadActiveStudentMembershipRows(
  clubId: string,
): Promise<ClubMembershipRow[]> {
  const membershipRows = await loadClubMembershipRows(clubId);
  return membershipRows.filter(isActiveStudentClubMembership);
}

/** Active student memberships with joined_at — same scope as the admin Students list. */
export async function loadActiveStudentMembershipDetailRows(
  clubId: string,
): Promise<ClubMembershipDetailRow[]> {
  const membershipRows = await loadClubMembershipDetailRows(clubId);
  return membershipRows.filter(isActiveStudentClubMembership);
}

export async function loadActiveStudentUserIds(clubId: string): Promise<Set<string>> {
  const membershipRows = await loadActiveStudentMembershipRows(clubId);
  return new Set(membershipRows.map((membership) => membership.user_id));
}

export async function countActiveStudentMemberships(clubId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await supabase
    .from("memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("role", "student")
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to count active student memberships: ${error.message}`);
  }

  return count ?? 0;
}

/** All club memberships — used for programme fallback counts and backfill. */
export async function countClubMemberships(clubId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await supabase
    .from("memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Failed to count memberships: ${error.message}`);
  }

  return count ?? 0;
}

interface MembershipBackfillRow {
  user_id: string;
  status: string | null;
  joined_at: string | null;
}

/** Loads membership rows for programme_memberships backfill (read-only on memberships). */
export async function loadClubMembershipBackfillRows(
  clubId: string,
): Promise<MembershipBackfillRow[]> {
  const supabase = getSupabaseAdminClient();
  const membershipRows: MembershipBackfillRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("memberships")
      .select("user_id, status, joined_at")
      .eq("club_id", clubId)
      .order("user_id", { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load memberships for backfill: ${error.message}`);
    }

    const page = (data ?? []) as MembershipBackfillRow[];
    membershipRows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return membershipRows;
}

/** No email/auth filters — includes imported legacy profiles with null email. */
export async function loadAdminStudentProfileRowsByIds(
  userIds: string[],
): Promise<Map<string, AdminStudentProfileRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const users: AdminStudentProfileRow[] = [];

  for (const batch of chunkIds(userIds)) {
    let { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, original_lead_source")
      .in("id", batch);

    if (error?.message?.includes("original_lead_source")) {
      const fallback = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", batch);

      data = (fallback.data ?? []).map((row) => ({
        ...row,
        original_lead_source: null,
      }));
      error = fallback.error;
    }

    if (error) {
      throw new Error(`Failed to load student profiles: ${error.message}`);
    }

    users.push(...((data ?? []) as AdminStudentProfileRow[]));
  }

  return new Map(users.map((user) => [user.id, user]));
}
