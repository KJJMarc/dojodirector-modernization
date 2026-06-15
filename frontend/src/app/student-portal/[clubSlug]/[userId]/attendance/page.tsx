import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalAttendanceView } from "@/components/student-portal/student-portal-attendance-view";
import { StudentPortalSubpageTopBar } from "@/components/student-portal/student-portal-subpage-top-bar";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { parseYearParam } from "@/lib/attendance-card";
import { requireStudentPortalPageContext } from "@/lib/student-portal-page.server";
import { getStudentPortalUiConfig } from "@/lib/student-portal-routing.shared";
import { getStudentPortalAttendancePageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalAttendancePageProps {
  params: { clubSlug: string; userId: string };
  searchParams: { year?: string };
}

export async function generateMetadata({
  params,
}: StudentPortalAttendancePageProps): Promise<Metadata> {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  return {
    title: `Dojo Director | Attendance | ${uiConfig.pageTitle}`,
    description: "View your attendance card.",
  };
}

export default async function StudentPortalAttendancePage({
  params,
  searchParams,
}: StudentPortalAttendancePageProps) {
  const year = parseYearParam(searchParams.year);
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  if (!uiConfig.showAdultAttendanceCard) {
    notFound();
  }

  let pageData;

  try {
    pageData = await getStudentPortalAttendancePageData(params.userId, year, club.id);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 overflow-x-hidden px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Attendance" clubName={uiConfig.clubDisplayName ?? club.name} />

      <StudentPortalSubpageTopBar clubSlug={club.slug} userId={params.userId} />

      <StudentPortalAttendanceView
        clubSlug={club.slug}
        userId={params.userId}
        pageData={pageData}
      />

      <StudentPortalHomeLink clubSlug={club.slug} userId={params.userId} />
    </main>
  );
}
