import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentPortalView } from "@/components/student-portal/student-portal-view";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { parseYearParam } from "@/lib/attendance-card";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { getStudentPortalPageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalPageProps {
  params: { userId: string };
  searchParams: { year?: string };
}

export async function generateMetadata({
  params,
}: StudentPortalPageProps): Promise<Metadata> {
  try {
    const pageData = await getStudentPortalPageData(
      params.userId,
      new Date().getFullYear(),
    );

    return {
      title: `DojoDirector | ${pageData.studentName}`,
      description: `Member portal for ${pageData.studentName}.`,
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
  let pageData;

  try {
    pageData = await getStudentPortalPageData(params.userId, year);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="My Portal" clubName={ACTIVE_CLUB_NAME} />

      <StudentPortalHomeLink />

      <StudentPortalView userId={params.userId} pageData={pageData} year={year} />
    </main>
  );
}
