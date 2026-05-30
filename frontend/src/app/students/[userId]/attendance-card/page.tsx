import { notFound } from "next/navigation";
import { toggleManualAttendance } from "@/app/students/[userId]/attendance-card/actions";
import { AttendanceCardToolbar } from "@/components/attendance/attendance-card-toolbar";
import { YearlyAttendanceGrid } from "@/components/attendance/yearly-attendance-grid";
import { AppHeader } from "@/components/layout/app-header";
import {
  getStudentAttendanceCardData,
  parseYearParam,
} from "@/lib/attendance-card";

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

  let cardData;
  try {
    cardData = await getStudentAttendanceCardData(params.userId, year);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }
    throw error;
  }

  return (
    <main className="attendance-card-page mx-auto min-h-screen w-full max-w-6xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <div className="print:hidden">
        <AppHeader pageTitle="Student Attendance Card" />
      </div>

      <AttendanceCardToolbar userId={params.userId} year={year} />

      <section className="attendance-card-sheet space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
        <header className="attendance-card-header space-y-1 border-b border-dojo-border pb-4 print:border-neutral-400 print:pb-3">
          <p className="text-xs uppercase tracking-wide text-dojo-muted print:text-neutral-600">
            Attendance card · {year}
          </p>
          <h1 className="text-2xl font-bold text-dojo-white print:text-black">
            {cardData.studentName}
          </h1>
          {cardData.beltLabel ? (
            <p className="text-sm font-medium text-dojo-muted print:text-neutral-700">
              Belt / rank: {cardData.beltLabel}
            </p>
          ) : null}
        </header>

        <div className="attendance-card-legend flex flex-wrap gap-4 text-xs text-dojo-muted print:text-neutral-700">
          <span>
            <strong className="text-dojo-white print:text-black">X</strong> = attended
          </span>
          <span>
            <strong className="text-dojo-white print:text-black">G</strong> = grading / promotion
          </span>
        </div>

        <YearlyAttendanceGrid
          rows={cardData.rows}
          year={year}
          userId={params.userId}
          toggleAttendanceAction={toggleManualAttendance}
        />

        <footer className="attendance-card-footer border-t border-dojo-border pt-4 print:border-neutral-400">
          <p className="text-sm font-semibold text-dojo-white print:text-black">
            Total attendance for {year}: {cardData.totalAttendance}
          </p>
        </footer>
      </section>
    </main>
  );
}
