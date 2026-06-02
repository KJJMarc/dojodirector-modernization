import { redirect } from "next/navigation";
import { getAuthenticatedInstructorPortalProfile } from "@/lib/instructor-portal-auth.server";
import { resolveInstructorPortalClubContext } from "@/lib/instructor-portal-club.server";
import {
  instructorPortalClubPath,
  instructorPortalEntryPath,
  instructorPortalLoginPath,
} from "@/lib/instructor-portal-routing.shared";

export const dynamic = "force-dynamic";

interface LegacyInstructorSlugPageProps {
  params: { slug: string };
}

async function resolveInstructorClubSlugForRedirect() {
  const profile = await getAuthenticatedInstructorPortalProfile();

  if (!profile) {
    redirect(instructorPortalLoginPath());
  }

  const clubContext = await resolveInstructorPortalClubContext(profile.userId);

  if (clubContext.accessibleClubs.length === 1 && clubContext.accessibleClubs[0]) {
    return clubContext.accessibleClubs[0].slug;
  }

  if (clubContext.selectedClub) {
    return clubContext.selectedClub.slug;
  }

  redirect(instructorPortalEntryPath());
}

export default async function LegacyInstructorSlugPage(_props: LegacyInstructorSlugPageProps) {
  const clubSlug = await resolveInstructorClubSlugForRedirect();
  redirect(instructorPortalClubPath(clubSlug));
}
