import Link from "next/link";
import { AttendanceCardCompactHeader } from "@/components/attendance/attendance-card-compact-header";
import { AttendanceCardComposedBlock } from "@/components/attendance/attendance-card-composed-block";
import { AttendanceCardLegend } from "@/components/attendance/attendance-card-legend";
import { attendanceCardHeaderRowClassName } from "@/components/attendance/attendance-card-meta";
import { attendanceCardSectionClassName } from "@/components/attendance/yearly-attendance-grid.shared";
import { ReadonlyYearlyAttendanceGrid } from "@/components/student-portal/readonly-yearly-attendance-grid";
import { studentPortalPath } from "@/lib/student-portal-routing.shared";
import type { StudentPortalAttendancePageData } from "@/lib/student-portal.shared";

interface StudentPortalAttendanceViewProps {
  clubSlug: string;
  userId: string;
  pageData: StudentPortalAttendancePageData;
}

const yearNavButtonClassName =
  "inline-flex min-h-[30px] shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-2.5 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50";

export function StudentPortalAttendanceView({
  clubSlug,
  userId,
  pageData,
}: StudentPortalAttendanceViewProps) {
  const basePath = studentPortalPath(clubSlug, userId, "attendance");
  const year = pageData.year;

  return (
    <section className={attendanceCardSectionClassName}>
      <div className={attendanceCardHeaderRowClassName}>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-dojo-red">
            Attendance card
          </h2>
          <p className="mt-0.5 text-xs text-dojo-muted/90">BJJ attendance by year.</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Link href={`${basePath}?year=${year - 1}`} className={yearNavButtonClassName}>
            Previous Year
          </Link>
          <Link href={`${basePath}?year=${year + 1}`} className={yearNavButtonClassName}>
            Next Year
          </Link>
        </div>
      </div>

      <AttendanceCardComposedBlock>
        <AttendanceCardCompactHeader
          studentName={pageData.studentName}
          year={year}
          rankLabel={pageData.attendanceBeltLabel}
          totalClasses={pageData.totalAttendanceForYear}
          headerStats={pageData.attendanceHeaderStats}
        />
        <AttendanceCardLegend />
        <p className="w-full text-[11px] leading-snug text-dojo-muted lg:hidden">
          Scroll the calendar horizontally to view all days through day 31.
        </p>
        <ReadonlyYearlyAttendanceGrid
          rows={pageData.attendanceRows}
          year={year}
          density="compact"
        />
      </AttendanceCardComposedBlock>
    </section>
  );
}
