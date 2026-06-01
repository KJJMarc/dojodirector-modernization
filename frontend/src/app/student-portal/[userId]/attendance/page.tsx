import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalAttendanceView } from "@/components/student-portal/student-portal-attendance-view";
import { StudentPortalBackLink } from "@/components/student-portal/student-portal-back-link";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { studentPortalAttendanceMainClassName } from "@/components/attendance/yearly-attendance-grid.shared";
import { parseYearParam } from "@/lib/attendance-card";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { getStudentPortalAttendancePageData } from "@/lib/student-portal.server";

export const dynamic = "force-dynamic";

interface StudentPortalAttendancePageProps {
  params: { userId: string };
  searchParams: { year?: string };
}

export async function generateMetadata({
  params,
  searchParams,
}: StudentPortalAttendancePageProps): Promise<Metadata> {
  try {
    const pageData = await getStudentPortalAttendancePageData(
      params.userId,
      parseYearParam(searchParams.year),
    );

    return {
      title: `DojoDirector | Attendance Card — ${pageData.studentName}`,
      description: `BJJ attendance card for ${pageData.studentName}.`,
    };
  } catch {
    return {
      title: "DojoDirector | Attendance Card",
      description: "View your BJJ attendance card.",
    };
  }
}

export default async function StudentPortalAttendancePage({
  params,
  searchParams,
}: StudentPortalAttendancePageProps) {
  const year = parseYearParam(searchParams.year);
  let pageData;

  try {
    pageData = await getStudentPortalAttendancePageData(params.userId, year);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    if (
      error instanceof Error &&
      error.message === "Attendance cards are not available."
    ) {
      notFound();
    }

    throw error;
  }

  return (
    <main className={studentPortalAttendanceMainClassName}>
      <AppHeader pageTitle="Attendance Card" clubName={ACTIVE_CLUB_NAME} />

      <StudentPortalBackLink userId={params.userId} />

      <StudentPortalAttendanceView userId={params.userId} pageData={pageData} />

      <StudentPortalHomeLink />
    </main>
  );
}
