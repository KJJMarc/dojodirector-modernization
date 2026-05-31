import { AttendanceCardGridShell } from "@/components/attendance/attendance-card-grid-shell";
import { AttendanceGridColGroup } from "@/components/attendance/attendance-grid-colgroup";
import {
  attendanceGridColumnHeaderClassName,
  attendanceGridDayCellBaseClassName,
  attendanceGridDayCellClassName,
  attendanceGridDayHeaderClassName,
  attendanceGridMonthLabelClassName,
  attendanceGridMonthRowClassName,
  attendanceGridTableClassName,
  type AttendanceGridDensity,
} from "@/components/attendance/yearly-attendance-grid.shared";
import { isAttendanceGridDayInMonth } from "@/lib/attendance-card-dates";
import { YearlyGridRow } from "@/lib/attendance-card";

interface ReadonlyYearlyAttendanceGridProps {
  rows: YearlyGridRow[];
  year: number;
  /** Narrower day columns for student portal cards. */
  density?: AttendanceGridDensity;
}

export function ReadonlyYearlyAttendanceGrid({
  rows,
  year,
  density = "compact",
}: ReadonlyYearlyAttendanceGridProps) {
  return (
    <AttendanceCardGridShell>
      <table className={attendanceGridTableClassName(density)}>
        <caption className="sr-only">Yearly attendance grid for {year}</caption>
        <AttendanceGridColGroup density={density} />
        <thead>
          <tr>
            <th scope="col" className={attendanceGridColumnHeaderClassName(density)}>
              Month
            </th>
            {Array.from({ length: 31 }, (_, index) => (
              <th
                key={index + 1}
                scope="col"
                className={attendanceGridDayHeaderClassName}
              >
                {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.month}
              className={attendanceGridMonthRowClassName(rowIndex)}
            >
              <th
                scope="row"
                className={attendanceGridMonthLabelClassName(rowIndex, density)}
              >
                {row.monthLabel}
              </th>
              {row.days.map((cell, dayIndex) => {
                const day = dayIndex + 1;
                const isValidDay = isAttendanceGridDayInMonth(year, row.month, day);

                return (
                  <td
                    key={`${row.month}-${day}`}
                    className={`${attendanceGridDayCellBaseClassName} ${attendanceGridDayCellClassName(
                      cell,
                      isValidDay,
                    )}`}
                    aria-disabled={!isValidDay || undefined}
                    aria-label={
                      isValidDay
                        ? `${row.monthLabel} ${day}: ${cell || "no attendance"}`
                        : `${row.monthLabel} day ${day}: not a valid date`
                    }
                  >
                    {isValidDay ? cell : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </AttendanceCardGridShell>
  );
}
