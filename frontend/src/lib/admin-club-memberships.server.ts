import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ClubMembershipRow {
  user_id: string;
  role: string | null;
  status: string | null;
}

export interface AdminStudentProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", batch);

    if (error) {
      throw new Error(`Failed to load student profiles: ${error.message}`);
    }

    users.push(...((data ?? []) as AdminStudentProfileRow[]));
  }

  return new Map(users.map((user) => [user.id, user]));
}
