import {
  attendanceLegendAttendedSwatchClassName,
  attendanceLegendGradingSwatchClassName,
} from "@/components/attendance/yearly-attendance-grid.shared";

export function AttendanceCardLegend() {
  return (
    <div
      className="attendance-card-legend flex w-full min-w-0 flex-wrap items-center gap-1.5 print:gap-1.5"
      aria-label="Attendance symbols"
    >
      <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 print:border-neutral-300">
        <span className={attendanceLegendAttendedSwatchClassName} aria-hidden>
          X
        </span>
        Attended
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 print:border-neutral-300">
        <span className={attendanceLegendGradingSwatchClassName} aria-hidden>
          G
        </span>
        Grading day
      </span>
    </div>
  );
}
