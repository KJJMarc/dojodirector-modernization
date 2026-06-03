import "server-only";

import {
  loadAdminMembershipsForUser,
  resolveAccessibleAcademyAdminMemberships,
} from "@/lib/admin-auth.server";
import { adminAcademySelectPath } from "@/lib/admin-auth.shared";
import { loadInstructorPortalAccessibleClubs } from "@/lib/instructor-portal-club.server";
import {
  resolveAcademySelectHref,
  sortAcademySelectOptions,
  type AcademyPortalAccessKind,
  type AcademySelectOption,
} from "@/lib/portal-academy-access.shared";
import { loadStudentPortalAccessibleClubs } from "@/lib/student-portal-club.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function loadUserIdByAuthUserId(authUserId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user for academy access: ${error.message}`);
  }

  return data?.id ?? null;
}

export async function loadAcademySelectOptionsForUser(
  userId: string,
): Promise<AcademySelectOption[]> {
  const [adminMemberships, instructorClubs, studentClubs] = await Promise.all([
    resolveAccessibleAcademyAdminMemberships(await loadAdminMembershipsForUser(userId)),
    loadInstructorPortalAccessibleClubs(userId),
    loadStudentPortalAccessibleClubs(userId),
  ]);

  const byClubId = new Map<string, AcademySelectOption>();

  const setOption = (
    club: { id: string; slug: string; name: string },
    accessKind: AcademyPortalAccessKind,
  ) => {
    const existing = byClubId.get(club.id);

    if (existing) {
      const existingPriority = portalAccessPriority(existing.accessKind);
      const nextPriority = portalAccessPriority(accessKind);

      if (nextPriority >= existingPriority) {
        return;
      }
    }

    byClubId.set(club.id, {
      clubId: club.id,
      clubSlug: club.slug,
      clubName: club.name,
      accessKind,
      href: resolveAcademySelectHref({ accessKind, clubSlug: club.slug, userId }),
    });
  };

  for (const membership of adminMemberships) {
    setOption(
      {
        id: membership.clubId,
        slug: membership.clubSlug,
        name: membership.clubName,
      },
      "admin",
    );
  }

  for (const club of instructorClubs) {
    setOption(club, "instructor");
  }

  for (const club of studentClubs) {
    setOption(club, "student");
  }

  return sortAcademySelectOptions(Array.from(byClubId.values()));
}

function portalAccessPriority(accessKind: AcademyPortalAccessKind): number {
  switch (accessKind) {
    case "admin":
      return 0;
    case "instructor":
      return 1;
    case "student":
      return 2;
  }
}

export async function loadAcademySelectOptionsForAuthUser(
  authUserId: string,
): Promise<AcademySelectOption[]> {
  const userId = await loadUserIdByAuthUserId(authUserId);

  if (!userId) {
    return [];
  }

  return loadAcademySelectOptionsForUser(userId);
}

export async function resolveAcademySelectLoginDestination(
  authUserId: string,
): Promise<string | null> {
  const options = await loadAcademySelectOptionsForAuthUser(authUserId);

  if (options.length === 0) {
    return null;
  }

  if (options.length === 1) {
    return options[0].href;
  }

  return adminAcademySelectPath();
}
