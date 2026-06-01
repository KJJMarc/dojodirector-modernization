import { notFound } from "next/navigation";
import { toggleManualAttendance } from "@/app/students/[userId]/attendance-card/actions";
import { AttendanceCardBreadcrumbs } from "@/components/attendance/attendance-card-breadcrumbs";
import { AttendanceCardCompactHeader } from "@/components/attendance/attendance-card-compact-header";
import { AttendanceCardComposedBlock } from "@/components/attendance/attendance-card-composed-block";
import { AttendanceCardLegend } from "@/components/attendance/attendance-card-legend";
import { AttendanceCardToolbar } from "@/components/attendance/attendance-card-toolbar";
import { YearlyAttendanceGrid } from "@/components/attendance/yearly-attendance-grid";
import { attendanceCardSectionClassName } from "@/components/attendance/yearly-attendance-grid.shared";
import { AppHeader } from "@/components/layout/app-header";
import { parseYearParam } from "@/lib/attendance-card";
import { loadStudentBjjFeatureVisibility } from "@/lib/admin-programmes.server";
import { getStudentAttendanceCardData } from "@/lib/attendance-card.server";
import { getStudentClubContextForAttendance } from "@/lib/attendance-card-manual.server";
import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";
import { getClubSlugById, requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface AttendanceCardPageProps {
  params: { userId: string };
  searchParams: { year?: string };
}

export default async function AttendanceCardPage({
  params,
  searchParams,
}: AttendanceCardPageProps) {
  const year = parseYearParam(searchParams.year);

  const { clubId } = await getStudentClubContextForAttendance(params.userId);
  const bjjFeatures = await loadStudentBjjFeatureVisibility(clubId, params.userId);

  if (!bjjFeatures.showAttendanceCard) {
    notFound();
  }

  let cardData;
  try {
    cardData = await getStudentAttendanceCardData(params.userId, year, clubId);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }
    throw error;
  }

  const clubSlug = (await getClubSlugById(clubId)) ?? KINGSTON_CLUB_SLUG;
  const club = await requireClubBySlug(clubSlug);

  return (
    <main className="attendance-card-page mx-auto min-h-screen w-full max-w-6xl space-y-3 overflow-x-hidden px-3 py-3 pb-20 sm:px-5">
      <div className="print:hidden">
        <AppHeader
          pageTitle="Student Attendance Card"
          clubName={club.name}
          contained
        />
      </div>

      <AttendanceCardBreadcrumbs
        clubSlug={club.slug}
        studentName={cardData.studentName}
        userId={params.userId}
      />

      <AttendanceCardToolbar userId={params.userId} year={year} />

      <section
        className={`attendance-card-sheet ${attendanceCardSectionClassName} print:space-y-2 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black`}
      >
        <AttendanceCardComposedBlock>
          <AttendanceCardCompactHeader
            studentName={cardData.studentName}
            year={year}
            rankLabel={cardData.beltLabel}
            totalClasses={cardData.totalAttendance}
            headerStats={cardData.headerStats}
          />
          <AttendanceCardLegend />
          <YearlyAttendanceGrid
            rows={cardData.rows}
            year={year}
            userId={params.userId}
            toggleAttendanceAction={toggleManualAttendance}
          />
        </AttendanceCardComposedBlock>
      </section>
    </main>
  );
}
