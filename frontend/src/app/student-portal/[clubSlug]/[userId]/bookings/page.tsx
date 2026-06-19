import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalSubpageTopBar } from "@/components/student-portal/student-portal-subpage-top-bar";
import { StudentPortalBookingsView } from "@/components/student-portal/student-portal-bookings-view";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { requireStudentPortalPageContext } from "@/lib/student-portal-page.server";
import { getStudentPortalUiConfig } from "@/lib/student-portal-routing.shared";
import { getStudentPortalBookingsPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalBookingsPageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({
  params,
}: StudentPortalBookingsPageProps): Promise<Metadata> {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  return {
    title: `Dojo Director | Manage Bookings | ${uiConfig.pageTitle}`,
    description: "View and manage upcoming class bookings.",
  };
}

export default async function StudentPortalBookingsPage({
  params,
}: StudentPortalBookingsPageProps) {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  if (!uiConfig.showUpcomingBookings) {
    notFound();
  }

  const pageData = await getStudentPortalBookingsPageData(params.userId, club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Manage Bookings" clubName={uiConfig.clubDisplayName ?? club.name} />

      <StudentPortalSubpageTopBar clubSlug={club.slug} userId={params.userId} />

      <StudentPortalBookingsView
        clubSlug={club.slug}
        userId={params.userId}
        pageData={pageData}
      />

      <StudentPortalHomeLink clubSlug={club.slug} userId={params.userId} />
    </main>
  );
}
