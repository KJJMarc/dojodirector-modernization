import { redirect } from "next/navigation";
import {
  instructorPortalClubPath,
  instructorPortalEntryPath,
} from "@/lib/instructor-portal-routing.shared";

export const dynamic = "force-dynamic";

interface LegacyInstructorMyClassesPageProps {
  params: { slug: string };
}

async function resolveInstructorClubSlugForRedirect() {
  const { getAuthenticatedInstructorPortalProfile } = await import(
    "@/lib/instructor-portal-auth.server"
  );
  const { resolveInstructorPortalClubContext } = await import(
    "@/lib/instructor-portal-club.server"
  );
  const { instructorPortalLoginPath } = await import(
    "@/lib/instructor-portal-routing.shared"
  );

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

export default async function LegacyInstructorMyClassesPage(
  _props: LegacyInstructorMyClassesPageProps,
) {
  const clubSlug = await resolveInstructorClubSlugForRedirect();
  redirect(instructorPortalClubPath(clubSlug, "my-classes"));
}
