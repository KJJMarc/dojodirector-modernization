import "server-only";

import { loadStudentBjjFeatureVisibility } from "@/lib/admin-programmes.server";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  resolveAttendanceCardClubFromCandidates,
  type AttendanceCardClubCandidate,
} from "@/lib/attendance-card-manual.shared";
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

export interface StudentClubContextForAttendanceOptions {
  explicitClubSlug?: string | null;
}

const LEGACY_ATTENDANCE_CARD_CLUB_CONTEXT: StudentClubContext = {
  clubId: ACTIVE_CLUB_ID,
  clubSlug: KINGSTON_CLUB_SLUG,
};

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

function readMembershipClubSlug(
  clubs: MembershipClubRow["clubs"],
): string | null {
  const club = Array.isArray(clubs) ? (clubs[0] ?? null) : clubs;
  const slug = club?.slug?.trim();
  return slug ? slug : null;
}

export async function getStudentClubContextForAttendance(
  userId: string,
  options?: StudentClubContextForAttendanceOptions,
): Promise<StudentClubContext> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, clubs(slug)")
    .eq("user_id", userId)
    .order("club_id", { ascending: true });

  if (error) {
    throw new Error(`Unable to load student club: ${error.message}`);
  }

  const rows = (data ?? []) as MembershipClubRow[];
  const candidates: AttendanceCardClubCandidate[] = [];

  for (const row of rows) {
    if (!row.club_id) {
      continue;
    }

    const clubSlug = readMembershipClubSlug(row.clubs);
    if (!clubSlug) {
      continue;
    }

    const bjjFeatures = await loadStudentBjjFeatureVisibility(row.club_id, userId);
    candidates.push({
      clubId: row.club_id,
      clubSlug,
      showAttendanceCard: bjjFeatures.showAttendanceCard,
    });
  }

  const resolution = resolveAttendanceCardClubFromCandidates(candidates, {
    explicitClubSlug: options?.explicitClubSlug,
    legacyPreferredClubId: ACTIVE_CLUB_ID,
  });

  if (resolution.kind === "club") {
    return {
      clubId: resolution.clubId,
      clubSlug: resolution.clubSlug,
    };
  }

  if (resolution.kind === "explicit_not_eligible") {
    throw new Error("Requested club is not eligible for attendance cards.");
  }

  return LEGACY_ATTENDANCE_CARD_CLUB_CONTEXT;
}
