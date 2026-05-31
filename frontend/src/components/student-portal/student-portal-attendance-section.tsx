import Link from "next/link";
import { AttendanceCardCompactHeader } from "@/components/attendance/attendance-card-compact-header";
import { AttendanceCardComposedBlock } from "@/components/attendance/attendance-card-composed-block";
import { AttendanceCardLegend } from "@/components/attendance/attendance-card-legend";
import { attendanceCardHeaderRowClassName } from "@/components/attendance/attendance-card-meta";
import { attendanceCardSectionClassName } from "@/components/attendance/yearly-attendance-grid.shared";
import { ReadonlyYearlyAttendanceGrid } from "@/components/student-portal/readonly-yearly-attendance-grid";
import type { StudentPortalPageData } from "@/lib/student-portal.shared";

interface StudentPortalAttendanceSectionProps {
  userId: string;
  pageData: StudentPortalPageData;
  year: number;
}

const yearNavButtonClassName =
  "inline-flex min-h-[30px] shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-2.5 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50";

export function StudentPortalAttendanceSection({
  userId,
  pageData,
  year,
}: StudentPortalAttendanceSectionProps) {
  const basePath = `/student-portal/${userId}`;

  return (
    <section className={attendanceCardSectionClassName}>
      <div className={attendanceCardHeaderRowClassName}>
        <h3 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Attendance card
        </h3>
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
        <ReadonlyYearlyAttendanceGrid
          rows={pageData.attendanceRows}
          year={year}
          density="compact"
        />
      </AttendanceCardComposedBlock>
    </section>
  );
}
