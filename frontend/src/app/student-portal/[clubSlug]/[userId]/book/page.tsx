import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalSubpageTopBar } from "@/components/student-portal/student-portal-subpage-top-bar";
import { StudentPortalBookClass } from "@/components/student-portal/student-portal-book-class";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { requireStudentPortalPageContext } from "@/lib/student-portal-page.server";
import { getStudentPortalUiConfig } from "@/lib/student-portal-routing.shared";
import { getStudentPortalBookPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalBookPageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({ params }: StudentPortalBookPageProps): Promise<Metadata> {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  return {
    title: `DojoDirector | Book a Class | ${uiConfig.pageTitle}`,
    description: "Book an upcoming class.",
  };
}

export default async function StudentPortalBookPage({ params }: StudentPortalBookPageProps) {
  const { club } = await requireStudentPortalPageContext(params.clubSlug, params.userId);
  const uiConfig = getStudentPortalUiConfig(club.slug, club.name);

  if (!uiConfig.showBookClass) {
    notFound();
  }

  const pageData = await getStudentPortalBookPageData(params.userId, club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Book a Class" clubName={uiConfig.clubDisplayName ?? club.name} />

      <StudentPortalSubpageTopBar clubSlug={club.slug} userId={params.userId} />

      <StudentPortalBookClass
        clubSlug={club.slug}
        userId={params.userId}
        sessionGroups={pageData.bookableSessionGroups}
      />

      <StudentPortalHomeLink clubSlug={club.slug} userId={params.userId} />
    </main>
  );
}
