import "server-only";

import {
  getProgrammesSchemaAvailable,
  loadUserIdsWithActiveStudentPortalProgrammeMembershipAtClub,
  userHasActiveStudentPortalProgrammeMembershipAtClub,
} from "@/lib/admin-programmes.server";
import { isSuperAdminMembershipRole } from "@/lib/admin-auth.shared";
import {
  isStudentMembershipRole,
} from "@/lib/admin-student-membership.shared";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import {
  KINGSTON_CLUB_SLUG,
  type ClubRow,
} from "@/lib/clubs.shared";
import { getClubBySlug, requireClubBySlug } from "@/lib/clubs.server";
import {
  studentPortalAgreementsPath,
  studentPortalEntryPath,
  studentPortalPath,
} from "@/lib/student-portal-routing.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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

interface UserClubMembershipRow {
  club_id: string;
  role: string | null;
  status: string | null;
}

function mapMembershipClubRow(row: MembershipClubRow): ClubRow | null {
  if (!row.clubs || !isActiveMembershipStatus(row.status)) {
    return null;
  }

  return {
    id: row.clubs.id,
    name: row.clubs.name,
    slug: row.clubs.slug,
    isActive: row.clubs.is_active ?? true,
  };
}

async function loadUserClubMembership(
  userId: string,
  clubId: string,
): Promise<UserClubMembershipRow | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load club membership: ${error.message}`);
  }

  return (data as UserClubMembershipRow | null) ?? null;
}

/**
 * Student portal access for a club: active academy membership plus an active
 * member/student relationship for that academy. Staff roles (admin, instructor,
 * super_admin) do not block access when a valid member record exists.
 */
export async function userHasActiveStudentPortalAccessAtClub(
  userId: string,
  clubId: string,
): Promise<boolean> {
  const membership = await loadUserClubMembership(userId, clubId);

  if (!membership || !isActiveMembershipStatus(membership.status)) {
    return false;
  }

  const programmesAvailable = await getProgrammesSchemaAvailable();

  if (!programmesAvailable) {
    return isStudentMembershipRole(membership.role);
  }

  if (await userHasActiveStudentPortalProgrammeMembershipAtClub(clubId, userId)) {
    return true;
  }

  return isStudentMembershipRole(membership.role);
}

interface ClubMembershipAccessRow {
  user_id: string;
  role: string | null;
  status: string | null;
}

/**
 * User ids with active student portal access at a club (same rules as portal login).
 * Includes instructors/admins when they have student role or active portal programme membership.
 */
export async function resolveActiveStudentPortalRecipientUserIdsAtClub(
  clubId: string,
  memberships: ClubMembershipAccessRow[],
): Promise<Set<string>> {
  const eligibleUserIds = new Set<string>();
  const activeMemberships = memberships.filter(
    (membership) =>
      isActiveMembershipStatus(membership.status) &&
      !isSuperAdminMembershipRole(membership.role),
  );

  if (activeMemberships.length === 0) {
    return eligibleUserIds;
  }

  const programmesAvailable = await getProgrammesSchemaAvailable();

  if (!programmesAvailable) {
    for (const membership of activeMemberships) {
      if (isStudentMembershipRole(membership.role)) {
        eligibleUserIds.add(membership.user_id);
      }
    }

    return eligibleUserIds;
  }

  const nonStudentRoleUserIds: string[] = [];

  for (const membership of activeMemberships) {
    if (isStudentMembershipRole(membership.role)) {
      eligibleUserIds.add(membership.user_id);
      continue;
    }

    nonStudentRoleUserIds.push(membership.user_id);
  }

  if (nonStudentRoleUserIds.length === 0) {
    return eligibleUserIds;
  }

  const programmeMemberUserIds =
    await loadUserIdsWithActiveStudentPortalProgrammeMembershipAtClub(
      clubId,
      nonStudentRoleUserIds,
    );

  for (const userId of Array.from(programmeMemberUserIds)) {
    eligibleUserIds.add(userId);
  }

  return eligibleUserIds;
}

export type StudentPortalStudentMembershipAccess =
  | { status: "active" }
  | { status: "inactive"; membershipStatus: string | null }
  | { status: "none" };

async function resolveInactiveStudentPortalMembershipStatus(
  userId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load memberships: ${error.message}`);
  }

  const rows = (data ?? []) as UserClubMembershipRow[];
  const studentRows = rows.filter((row) => isStudentMembershipRole(row.role));

  if (
    studentRows.length > 0 &&
    !studentRows.some((row) => isActiveMembershipStatus(row.status))
  ) {
    return studentRows[0]?.status ?? null;
  }

  if (!(await getProgrammesSchemaAvailable())) {
    return null;
  }

  const { data: programmeRows, error: programmeError } = await supabase
    .from("programme_memberships")
    .select("status")
    .eq("user_id", userId);

  if (programmeError) {
    return null;
  }

  const programmeMemberships = (programmeRows ?? []) as { status: string | null }[];

  if (programmeMemberships.length === 0) {
    return null;
  }

  const hasActiveProgrammeMembership = programmeMemberships.some(
    (row) => row.status === "active",
  );
  const hasActiveClubMembership = rows.some((row) =>
    isActiveMembershipStatus(row.status),
  );

  if (hasActiveClubMembership && !hasActiveProgrammeMembership) {
    return programmeMemberships[0]?.status ?? "inactive";
  }

  return null;
}

export async function resolveStudentPortalStudentMembershipAccess(
  userId: string,
): Promise<StudentPortalStudentMembershipAccess> {
  const accessibleClubs = await loadStudentPortalAccessibleClubs(userId);

  if (accessibleClubs.length > 0) {
    return { status: "active" };
  }

  const inactiveStatus = await resolveInactiveStudentPortalMembershipStatus(userId);

  if (inactiveStatus !== null) {
    return {
      status: "inactive",
      membershipStatus: inactiveStatus,
    };
  }

  return { status: "none" };
}

export async function loadStudentPortalAccessibleClubs(
  userId: string,
): Promise<ClubRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("club_id, role, status, clubs(id, name, slug, is_active)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load student portal clubs: ${error.message}`);
  }

  const clubs = new Map<string, ClubRow>();

  for (const row of (data ?? []) as unknown as MembershipClubRow[]) {
    const club = mapMembershipClubRow(row);

    if (!club || !club.isActive) {
      continue;
    }

    const canAccess = await userHasActiveStudentPortalAccessAtClub(userId, club.id);

    if (!canAccess) {
      continue;
    }

    clubs.set(club.id, club);
  }

  return Array.from(clubs.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function userCanAccessStudentPortalClub(
  userId: string,
  clubSlug: string,
): Promise<boolean> {
  const club = await getClubBySlug(clubSlug);

  if (!club) {
    return false;
  }

  return userHasActiveStudentPortalAccessAtClub(userId, club.id);
}

export async function requireStudentPortalClubAccess(
  userId: string,
  clubSlug: string,
): Promise<ClubRow> {
  const club = await requireClubBySlug(clubSlug);
  const canAccess = await userHasActiveStudentPortalAccessAtClub(userId, club.id);

  if (!canAccess) {
    throw new Error("STUDENT_PORTAL_CLUB_ACCESS_DENIED");
  }

  return club;
}

export interface StudentPortalClubContext {
  accessibleClubs: ClubRow[];
  requiresAcademySelection: boolean;
}

export async function resolveStudentPortalClubContext(
  userId: string,
): Promise<StudentPortalClubContext> {
  const accessibleClubs = await loadStudentPortalAccessibleClubs(userId);

  return {
    accessibleClubs,
    requiresAcademySelection: accessibleClubs.length > 1,
  };
}

export async function resolveStudentPortalHomePath(userId: string): Promise<string> {
  const { accessibleClubs, requiresAcademySelection } =
    await resolveStudentPortalClubContext(userId);

  if (requiresAcademySelection || accessibleClubs.length === 0) {
    return studentPortalEntryPath();
  }

  const club = accessibleClubs[0];

  if (!club) {
    return studentPortalEntryPath();
  }

  return studentPortalPath(club.slug, userId);
}

export async function resolveLegacyStudentPortalRedirectPath(
  userId: string,
): Promise<string> {
  const { accessibleClubs, requiresAcademySelection } =
    await resolveStudentPortalClubContext(userId);

  if (requiresAcademySelection) {
    return studentPortalEntryPath();
  }

  if (accessibleClubs.length === 1 && accessibleClubs[0]) {
    return studentPortalPath(accessibleClubs[0].slug, userId);
  }

  const kjjOnly =
    accessibleClubs.length === 1 &&
    accessibleClubs[0]?.slug === KINGSTON_CLUB_SLUG;

  if (kjjOnly && accessibleClubs[0]) {
    return studentPortalPath(accessibleClubs[0].slug, userId);
  }

  if (accessibleClubs.some((club) => club.slug === KINGSTON_CLUB_SLUG)) {
    return studentPortalPath(KINGSTON_CLUB_SLUG, userId);
  }

  if (accessibleClubs[0]) {
    return studentPortalPath(accessibleClubs[0].slug, userId);
  }

  return studentPortalEntryPath();
}

export async function resolveStudentPortalClubId(
  userId: string,
  clubSlug: string,
): Promise<{ clubId: string; club: ClubRow }> {
  const club = await requireStudentPortalClubAccess(userId, clubSlug);

  return {
    clubId: club.id,
    club,
  };
}

export async function getStudentPortalClubBySlug(
  clubSlug: string,
): Promise<ClubRow | null> {
  return getClubBySlug(clubSlug);
}

export function studentPortalAgreementsRedirectPath() {
  return studentPortalAgreementsPath();
}
