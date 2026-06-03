import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentPortalView } from "@/components/student-portal/student-portal-view";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalTopBar } from "@/components/student-portal/student-portal-top-bar";
import { parseYearParam } from "@/lib/attendance-card";
import { requireStudentPortalPageContext } from "@/lib/student-portal-page.server";
import { getStudentPortalUiConfig } from "@/lib/student-portal-routing.shared";
import { countUnreadPortalMessages } from "@/lib/portal-messages.server";
import { getStudentPortalPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalPageProps {
  params: { clubSlug: string; userId: string };
  searchParams: { year?: string };
}

export async function generateMetadata({
  params,
}: StudentPortalPageProps): Promise<Metadata> {
  try {
    const { club } = await requireStudentPortalPageContext(
      params.clubSlug,
      params.userId,
    );
    const uiConfig = getStudentPortalUiConfig(club.slug, club.name);
    const pageData = await getStudentPortalPageData(
      params.userId,
      new Date().getFullYear(),
      club.id,
    );

    return {
      title: `DojoDirector | ${uiConfig.pageTitle} | ${pageData.studentName}`,
      description: `Member portal for ${pageData.studentName} at ${club.name}.`,
    };
  } catch {
    return {
      title: "DojoDirector | My Portal",
      description: "Your member portal.",
    };
  }
}

export default async function StudentPortalPage({
  params,
  searchParams,
}: StudentPortalPageProps) {
  const year = parseYearParam(searchParams.year);
  const { club, profile } = await requireStudentPortalPageContext(
    params.clubSlug,
    params.userId,
  );
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);
  const unreadMessageCount = uiConfig.showMessages
    ? await countUnreadPortalMessages({
        clubId: club.id,
        recipientUserId: profile.userId,
        recipientType: "student",
      })
    : 0;
  let pageData;

  try {
    pageData = await getStudentPortalPageData(params.userId, year, club.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 overflow-x-hidden px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="My Portal" clubName={uiConfig.clubDisplayName ?? club.name} />

      <StudentPortalTopBar />

      <StudentPortalView
        clubSlug={club.slug}
        userId={params.userId}
        uiConfig={uiConfig}
        pageData={pageData}
        year={year}
        unreadMessageCount={unreadMessageCount}
      />
    </main>
  );
}
