import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalSubpageTopBar } from "@/components/student-portal/student-portal-subpage-top-bar";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { StudentPortalMessagesPlaceholder } from "@/components/student-portal/student-portal-messages-placeholder";
import { requireStudentPortalPageContext } from "@/lib/student-portal-page.server";
import { getStudentPortalUiConfig } from "@/lib/student-portal-routing.shared";
import { getStudentPortalPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalMessagesPageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({
  params,
}: StudentPortalMessagesPageProps): Promise<Metadata> {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  return {
    title: `DojoDirector | Messages | ${uiConfig.pageTitle}`,
    description: "Member portal messages.",
  };
}

export default async function StudentPortalMessagesPage({
  params,
}: StudentPortalMessagesPageProps) {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  if (!uiConfig.showMessages) {
    notFound();
  }

  await getStudentPortalPageData(params.userId, new Date().getFullYear(), club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Messages" clubName={uiConfig.clubDisplayName ?? club.name} />

      <StudentPortalSubpageTopBar clubSlug={club.slug} userId={params.userId} />

      <StudentPortalMessagesPlaceholder />

      <StudentPortalHomeLink clubSlug={club.slug} userId={params.userId} />
    </main>
  );
}
