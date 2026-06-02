import "server-only";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { INSTRUCTOR_MEMBERSHIP_ROLES } from "@/lib/admin-instructors.shared";
import { isInstructorPortalMembershipRole } from "@/lib/instructor-portal-auth.shared";
import type { ClubRow } from "@/lib/clubs.shared";
import { getClubBySlug } from "@/lib/clubs.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const INSTRUCTOR_PORTAL_CLUB_COOKIE = "instructor_portal_club_slug";

interface MembershipClubRow {
  club_id: string;
  role: string | null;
  status: string | null;
  clubs: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean | null;
  } | null;
}

function normalizeClubJoin(
  clubs: MembershipClubRow["clubs"] | NonNullable<MembershipClubRow["clubs"]>[] | null,
): MembershipClubRow["clubs"] {
  if (!clubs) {
    return null;
  }

  return Array.isArray(clubs) ? (clubs[0] ?? null) : clubs;
}

function mapMembershipClub(row: MembershipClubRow): ClubRow | null {
  if (!row.clubs) {
    return null;
  }

  return {
    id: row.clubs.id,
    name: row.clubs.name,
    slug: row.clubs.slug,
    isActive: row.clubs.is_active ?? true,
  };
}

export async function loadInstructorPortalAccessibleClubs(
  userId: string,
): Promise<ClubRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status, clubs(id, name, slug, is_active)")
    .eq("user_id", userId)
    .in("role", [...INSTRUCTOR_MEMBERSHIP_ROLES])
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to load instructor portal clubs: ${error.message}`);
  }

  const clubs = new Map<string, ClubRow>();

  for (const rawRow of data ?? []) {
    const row: MembershipClubRow = {
      club_id: rawRow.club_id,
      role: rawRow.role,
      status: rawRow.status,
      clubs: normalizeClubJoin(rawRow.clubs),
    };

    if (!isInstructorPortalMembershipRole(row.role)) {
      continue;
    }

    const club = mapMembershipClub(row);

    if (!club || !club.isActive) {
      continue;
    }

    clubs.set(club.id, club);
  }

  return Array.from(clubs.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function userCanAccessInstructorPortalClub(
  userId: string,
  clubSlug: string,
): Promise<boolean> {
  const accessibleClubs = await loadInstructorPortalAccessibleClubs(userId);
  const normalizedSlug = clubSlug.trim().toLowerCase();

  return accessibleClubs.some((club) => club.slug === normalizedSlug);
}

export async function readSelectedInstructorPortalClubSlug(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(INSTRUCTOR_PORTAL_CLUB_COOKIE)?.value?.trim().toLowerCase();

  return value || null;
}

export async function setSelectedInstructorPortalClubSlug(clubSlug: string) {
  const cookieStore = await cookies();
  cookieStore.set(INSTRUCTOR_PORTAL_CLUB_COOKIE, clubSlug.trim().toLowerCase(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function clearSelectedInstructorPortalClubSlug() {
  const cookieStore = await cookies();
  cookieStore.delete(INSTRUCTOR_PORTAL_CLUB_COOKIE);
}

export interface InstructorPortalClubContext {
  accessibleClubs: ClubRow[];
  selectedClub: ClubRow | null;
  requiresAcademySelection: boolean;
}

export async function resolveInstructorPortalClubContext(
  userId: string,
): Promise<InstructorPortalClubContext> {
  const accessibleClubs = await loadInstructorPortalAccessibleClubs(userId);

  if (accessibleClubs.length === 0) {
    return {
      accessibleClubs,
      selectedClub: null,
      requiresAcademySelection: false,
    };
  }

  if (accessibleClubs.length === 1) {
    return {
      accessibleClubs,
      selectedClub: accessibleClubs[0] ?? null,
      requiresAcademySelection: false,
    };
  }

  const selectedSlug = await readSelectedInstructorPortalClubSlug();
  const selectedClub =
    accessibleClubs.find((club) => club.slug === selectedSlug) ?? null;

  return {
    accessibleClubs,
    selectedClub,
    requiresAcademySelection: selectedClub === null,
  };
}

export async function requireSelectedInstructorPortalClub(
  userId: string,
): Promise<ClubRow> {
  const context = await resolveInstructorPortalClubContext(userId);

  if (context.requiresAcademySelection || !context.selectedClub) {
    notFound();
  }

  return context.selectedClub;
}

export async function resolveSelectedInstructorPortalClubForUser(
  userId: string,
): Promise<ClubRow | null> {
  const context = await resolveInstructorPortalClubContext(userId);

  if (context.requiresAcademySelection) {
    return null;
  }

  return context.selectedClub;
}

export async function getSelectedInstructorPortalClubByCookie(): Promise<ClubRow | null> {
  const slug = await readSelectedInstructorPortalClubSlug();

  if (!slug) {
    return null;
  }

  return getClubBySlug(slug);
}
