import "server-only";

import { notFound, redirect } from "next/navigation";
import { hasAcceptedCurrentStudentAgreements } from "@/lib/student-portal-agreements.server";
import {
  requireStudentPortalClubAccess,
  resolveStudentPortalClubContext,
} from "@/lib/student-portal-club.server";
import {
  studentPortalAgreementsPath,
  studentPortalEntryPath,
  studentPortalPath,
} from "@/lib/student-portal-routing.shared";
import { getAuthenticatedStudentPortalProfile } from "@/lib/student-portal-auth.server";
import type { ClubRow } from "@/lib/clubs.shared";
import type { StudentPortalAuthProfile } from "@/lib/student-portal-auth.server";

export interface StudentPortalPageContext {
  profile: StudentPortalAuthProfile;
  club: ClubRow;
  clubContext: Awaited<ReturnType<typeof resolveStudentPortalClubContext>>;
}

export async function requireStudentPortalPageContext(
  clubSlug: string,
  userId: string,
): Promise<StudentPortalPageContext> {
  const profile = await getAuthenticatedStudentPortalProfile();

  if (!profile) {
    redirect("/student-portal/login");
  }

  if (profile.userId !== userId) {
    redirect(studentPortalPath(clubSlug, profile.userId));
  }

  let club: ClubRow;

  try {
    club = await requireStudentPortalClubAccess(profile.userId, clubSlug);
  } catch {
    notFound();
  }

  const agreementsComplete = await hasAcceptedCurrentStudentAgreements(profile.userId, {
    logContext: "requireStudentPortalPageContext.guard",
  });

  if (!agreementsComplete) {
    redirect(studentPortalAgreementsPath());
  }

  const clubContext = await resolveStudentPortalClubContext(profile.userId);

  return {
    profile,
    club,
    clubContext,
  };
}

export async function requireAuthenticatedStudentPortalProfile() {
  const profile = await getAuthenticatedStudentPortalProfile();

  if (!profile) {
    redirect("/student-portal/login");
  }

  return profile;
}

export async function redirectAuthenticatedStudentPortalEntry(profileUserId: string) {
  const clubContext = await resolveStudentPortalClubContext(profileUserId);

  if (clubContext.requiresAcademySelection) {
    redirect(studentPortalEntryPath());
  }

  const club = clubContext.accessibleClubs[0];

  if (!club) {
    redirect(studentPortalEntryPath());
  }

  redirect(studentPortalPath(club.slug, profileUserId));
}
