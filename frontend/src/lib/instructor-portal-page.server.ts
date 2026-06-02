import "server-only";

import { notFound, redirect } from "next/navigation";
import { getClubBySlug } from "@/lib/clubs.server";
import type { ClubRow } from "@/lib/clubs.shared";
import { getAuthenticatedInstructorPortalProfile } from "@/lib/instructor-portal-auth.server";
import {
  resolveInstructorPortalClubContext,
  userCanAccessInstructorPortalClub,
  type InstructorPortalClubContext,
} from "@/lib/instructor-portal-club.server";
import {
  instructorPortalClubPath,
  instructorPortalEntryPath,
  instructorPortalLoginPath,
} from "@/lib/instructor-portal-routing.shared";
import type { InstructorPortalAuthProfile } from "@/lib/instructor-portal-auth.server";

export interface InstructorPortalPageContext {
  profile: InstructorPortalAuthProfile;
  club: ClubRow;
  clubContext: InstructorPortalClubContext;
}

export async function requireInstructorPortalPageContext(
  clubSlug: string,
): Promise<InstructorPortalPageContext> {
  const profile = await getAuthenticatedInstructorPortalProfile();

  if (!profile) {
    redirect(instructorPortalLoginPath());
  }

  const normalizedSlug = clubSlug.trim().toLowerCase();
  const club = await getClubBySlug(normalizedSlug);

  if (!club) {
    notFound();
  }

  const canAccess = await userCanAccessInstructorPortalClub(profile.userId, normalizedSlug);

  if (!canAccess) {
    notFound();
  }

  const clubContext = await resolveInstructorPortalClubContext(profile.userId);

  return {
    profile,
    club,
    clubContext,
  };
}

export async function redirectInstructorPortalEntry(profileUserId: string) {
  const clubContext = await resolveInstructorPortalClubContext(profileUserId);

  if (clubContext.requiresAcademySelection || clubContext.accessibleClubs.length !== 1) {
    redirect(instructorPortalEntryPath());
  }

  const club = clubContext.accessibleClubs[0];

  if (!club) {
    redirect(instructorPortalEntryPath());
  }

  redirect(instructorPortalClubPath(club.slug));
}

export async function tryInstructorPortalPageContext(
  clubSlug: string,
): Promise<InstructorPortalPageContext | null> {
  const profile = await getAuthenticatedInstructorPortalProfile();

  if (!profile) {
    return null;
  }

  try {
    return await requireInstructorPortalPageContext(clubSlug);
  } catch {
    return null;
  }
}
