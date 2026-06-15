import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalSubpageTopBar } from "@/components/student-portal/student-portal-subpage-top-bar";
import { StudentPortalGradingHistoryView } from "@/components/student-portal/student-portal-grading-history-view";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { requireStudentPortalPageContext } from "@/lib/student-portal-page.server";
import { getStudentPortalUiConfig } from "@/lib/student-portal-routing.shared";
import { getStudentPortalGradingHistoryPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalGradingHistoryPageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({
  params,
}: StudentPortalGradingHistoryPageProps): Promise<Metadata> {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  return {
    title: `Dojo Director | Grading History | ${uiConfig.pageTitle}`,
    description: "View grading history.",
  };
}

export default async function StudentPortalGradingHistoryPage({
  params,
}: StudentPortalGradingHistoryPageProps) {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  if (!uiConfig.showGradingHistory) {
    notFound();
  }

  let pageData;

  try {
    pageData = await getStudentPortalGradingHistoryPageData(params.userId, club.id);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Grading History" clubName={uiConfig.clubDisplayName ?? club.name} />

      <StudentPortalSubpageTopBar clubSlug={club.slug} userId={params.userId} />

      <StudentPortalGradingHistoryView pageData={pageData} />

      <StudentPortalHomeLink clubSlug={club.slug} userId={params.userId} />
    </main>
  );
}
