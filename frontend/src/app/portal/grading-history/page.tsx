import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalBackLink } from "@/components/student-portal/student-portal-back-link";
import { StudentPortalGradingHistoryView } from "@/components/student-portal/student-portal-grading-history-view";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { requireClubBySlug } from "@/lib/clubs.server";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";
import { getAuthenticatedStudentPortalProfile } from "@/lib/student-portal-auth.server";
import { loadStudentPortalAccessibleClubs } from "@/lib/student-portal-club.server";
import { studentPortalPath } from "@/lib/student-portal-routing.shared";
import { getStudentPortalGradingHistoryPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const profile = await getAuthenticatedStudentPortalProfile();

    if (!profile) {
      return {
        title: "DojoDirector | Grading History",
        description: "View your belt and stripe progression history.",
      };
    }

    const club = await requireClubBySlug(KINGSTON_CLUB_SLUG);
    const pageData = await getStudentPortalGradingHistoryPageData(
      profile.userId,
      club.id,
    );

    return {
      title: `DojoDirector | Grading History — ${pageData.studentName}`,
      description: `Belt and stripe progression for ${pageData.studentName}.`,
    };
  } catch {
    return {
      title: "DojoDirector | Grading History",
      description: "View your belt and stripe progression history.",
    };
  }
}

export default async function PortalGradingHistoryPage() {
  const profile = await getAuthenticatedStudentPortalProfile();

  if (!profile) {
    notFound();
  }

  const accessibleClubs = await loadStudentPortalAccessibleClubs(profile.userId);
  const kjjClub =
    accessibleClubs.find((club) => club.slug === KINGSTON_CLUB_SLUG) ??
    accessibleClubs[0];

  if (!kjjClub) {
    notFound();
  }

  if (kjjClub.slug !== KINGSTON_CLUB_SLUG) {
    redirect(studentPortalPath(kjjClub.slug, profile.userId, "grading-history"));
  }

  let pageData;

  try {
    pageData = await getStudentPortalGradingHistoryPageData(profile.userId, kjjClub.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Grading History" clubName={kjjClub.name} />

      <StudentPortalBackLink clubSlug={kjjClub.slug} userId={profile.userId} />

      <StudentPortalGradingHistoryView pageData={pageData} />

      <StudentPortalHomeLink clubSlug={kjjClub.slug} userId={profile.userId} />
    </main>
  );
}
