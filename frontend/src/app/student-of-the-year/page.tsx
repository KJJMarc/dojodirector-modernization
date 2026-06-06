import type { Metadata } from "next";
import { PublicAcademyPageHeader } from "@/components/public/public-academy-page-header";
import { StudentOfTheYearView } from "@/components/public/student-of-the-year-view";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { getStudentOfTheYearPageData } from "@/lib/student-of-the-year.server";
import { publicAcademyDocumentTitle } from "@/lib/public-academy-branding.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: publicAcademyDocumentTitle(ACTIVE_CLUB_NAME, "Student of the Year"),
  description: `Annual Student of the Year winners at ${ACTIVE_CLUB_NAME}.`,
};

export default async function StudentOfTheYearPage() {
  const pageData = await getStudentOfTheYearPageData();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 pb-16 sm:px-6 sm:py-10">
      <PublicAcademyPageHeader
        pageTitle="Student of the Year"
        clubName={pageData.clubName}
      />
      <div className="mt-8">
        <StudentOfTheYearView pageData={pageData} />
      </div>
    </main>
  );
}
