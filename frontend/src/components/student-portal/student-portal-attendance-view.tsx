import Link from "next/link";
import { ReadonlyYearlyAttendanceGrid } from "@/components/student-portal/readonly-yearly-attendance-grid";
import type { StudentPortalAttendancePageData } from "@/lib/student-portal.shared";

interface StudentPortalAttendanceViewProps {
  userId: string;
  pageData: StudentPortalAttendancePageData;
}

export function StudentPortalAttendanceView({
  userId,
  pageData,
}: StudentPortalAttendanceViewProps) {
  const basePath = `/student-portal/${userId}/attendance`;
  const year = pageData.year;

  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            ATTENDANCE CARD
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">BJJ attendance by year.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${basePath}?year=${year - 1}`}
            className="rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm font-medium text-dojo-white transition hover:border-dojo-red/50"
          >
            Previous Year
          </Link>
          <Link
            href={`${basePath}?year=${year + 1}`}
            className="rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm font-medium text-dojo-white transition hover:border-dojo-red/50"
          >
            Next Year
          </Link>
        </div>
      </div>

      <header className="space-y-1 border-b border-dojo-border pb-4">
        <p className="text-xs uppercase tracking-wide text-dojo-muted">
          {year} · BJJ attendance
        </p>
        {pageData.attendanceBeltLabel ? (
          <p className="text-sm font-medium text-dojo-muted">
            Rank: {pageData.attendanceBeltLabel}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-4 text-xs text-dojo-muted">
        <span>
          <strong className="text-dojo-white">X</strong> = attended
        </span>
        <span>
          <strong className="text-dojo-white">G</strong> = grading day
        </span>
      </div>

      <ReadonlyYearlyAttendanceGrid rows={pageData.attendanceRows} year={year} />

      <p className="text-sm font-semibold text-dojo-white">
        Total classes in {year}: {pageData.totalAttendanceForYear}
      </p>
    </section>
  );
}
