import {
  formatAttendanceCardRankLabel,
  type AttendanceCardHeaderStats,
} from "@/lib/attendance-card";
import {
  formatAttendanceCardProgressLine,
  formatYearClassesAttended,
} from "@/lib/attendance-card-header.shared";

interface AttendanceCardCompactHeaderProps {
  studentName: string;
  year: number;
  attendanceType?: string;
  rankLabel: string | null;
  totalClasses: number;
  headerStats?: AttendanceCardHeaderStats;
}

export function AttendanceCardCompactHeader({
  studentName,
  year,
  attendanceType = "BJJ",
  rankLabel,
  totalClasses,
  headerStats,
}: AttendanceCardCompactHeaderProps) {
  const summaryParts = [
    String(year),
    attendanceType,
    formatAttendanceCardRankLabel(rankLabel) ?? "—",
    formatYearClassesAttended(totalClasses),
  ];

  return (
    <header className="attendance-card-compact-header w-full min-w-0 print:text-black">
      <h1 className="text-lg font-semibold leading-snug tracking-tight text-dojo-white print:text-black sm:text-xl">
        {studentName}
      </h1>
      <p className="mt-0.5 text-sm leading-snug text-dojo-muted print:text-neutral-700">
        {summaryParts.map((part, index) => (
          <span key={`${index}-${part}`}>
            {index > 0 ? (
              <span className="text-dojo-muted/50 print:text-neutral-400" aria-hidden>
                {" "}
                ·{" "}
              </span>
            ) : null}
            {part}
          </span>
        ))}
      </p>
      {headerStats ? (
        <p className="mt-0.5 text-xs leading-snug text-dojo-muted/90 print:text-neutral-600">
          {formatAttendanceCardProgressLine(headerStats)}
        </p>
      ) : null}
    </header>
  );
}
