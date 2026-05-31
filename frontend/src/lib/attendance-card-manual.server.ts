import "server-only";

import { ACTIVE_CLUB_ID } from "@/lib/branding";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface MembershipClubRow {
  club_id: string;
  clubs: { slug: string } | { slug: string }[] | null;
}

export interface StudentClubContext {
  clubId: string;
  clubSlug: string;
}

export async function getClubSlugById(clubId: string): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load club: ${error.message}`);
  }

  return data?.slug ?? KINGSTON_CLUB_SLUG;
}

export async function getStudentClubContextForAttendance(
  userId: string,
): Promise<StudentClubContext> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, clubs(slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load student club: ${error.message}`);
  }

  if (!data?.club_id) {
    return { clubId: ACTIVE_CLUB_ID, clubSlug: KINGSTON_CLUB_SLUG };
  }

  const membership = data as MembershipClubRow;
  const clubs = membership.clubs;
  const club = Array.isArray(clubs) ? (clubs[0] ?? null) : clubs;

  return {
    clubId: membership.club_id,
    clubSlug: club?.slug ?? KINGSTON_CLUB_SLUG,
  };
}
