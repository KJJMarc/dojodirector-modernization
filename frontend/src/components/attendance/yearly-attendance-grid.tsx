"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AttendanceCardGridShell } from "@/components/attendance/attendance-card-grid-shell";
import { AttendanceGridColGroup } from "@/components/attendance/attendance-grid-colgroup";
import {
  attendanceGridColumnHeaderClassName,
  attendanceGridDayCellBaseClassName,
  attendanceGridDayCellClassName,
  attendanceGridDayHeaderClassName,
  attendanceGridEditHintClassName,
  attendanceGridMonthLabelClassName,
  attendanceGridMonthRowClassName,
  attendanceGridTableClassName,
} from "@/components/attendance/yearly-attendance-grid.shared";
import { GridCell, YearlyGridRow } from "@/lib/attendance-card";
import {
  formatAttendanceDateKey,
  isAttendanceGridDayInMonth,
  isFutureAttendanceDate,
} from "@/lib/attendance-card-dates";

interface YearlyAttendanceGridProps {
  rows: YearlyGridRow[];
  year: number;
  userId: string;
  clubSlug?: string;
  toggleAttendanceAction: (formData: FormData) => Promise<void>;
}

function canEditCell(
  cell: GridCell,
  isValidDay: boolean,
  year: number,
  month: number,
  day: number,
) {
  if (!isValidDay || cell === "G") {
    return false;
  }

  if (cell === "X") {
    return true;
  }

  const dateKey = formatAttendanceDateKey(year, month, day);
  return !isFutureAttendanceDate(dateKey);
}

export function YearlyAttendanceGrid({
  rows,
  year,
  userId,
  clubSlug,
  toggleAttendanceAction,
}: YearlyAttendanceGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const density = "standard" as const;

  const handleCellClick = (
    cell: GridCell,
    month: number,
    day: number,
    isValidDay: boolean,
  ) => {
    if (!canEditCell(cell, isValidDay, year, month, day)) {
      return;
    }

    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("year", String(year));
    formData.set("month", String(month));
    formData.set("day", String(day));
    formData.set("mode", cell === "X" ? "remove" : "add");
    if (clubSlug) {
      formData.set("clubSlug", clubSlug);
    }

    startTransition(async () => {
      await toggleAttendanceAction(formData);
      router.refresh();
    });
  };

  return (
    <div className={isPending ? "pointer-events-none opacity-60" : undefined}>
      <AttendanceCardGridShell
        gridHeader={
          <p className={attendanceGridEditHintClassName}>
            Click a day to add or remove BJJ attendance. Grading days and invalid dates
            cannot be edited here.
          </p>
        }
      >
        <table
          className={`${attendanceGridTableClassName(density)} print:pointer-events-none`}
        >
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
                  const isInteractive = canEditCell(
                    cell,
                    isValidDay,
                    year,
                    row.month,
                    day,
                  );

                  return (
                    <td
                      key={`${row.month}-${day}`}
                      className={`${attendanceGridDayCellBaseClassName} ${attendanceGridDayCellClassName(
                        cell,
                        isValidDay,
                        { isInteractive },
                      )}`}
                      aria-disabled={!isValidDay || undefined}
                      aria-label={
                        isValidDay
                          ? `${row.monthLabel} ${day}: ${cell || "no attendance"}`
                          : `${row.monthLabel} day ${day}: not a valid date`
                      }
                      onClick={
                        isInteractive
                          ? () => handleCellClick(cell, row.month, day, isValidDay)
                          : undefined
                      }
                      onKeyDown={
                        isInteractive
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleCellClick(cell, row.month, day, isValidDay);
                              }
                            }
                          : undefined
                      }
                      role={isInteractive ? "button" : undefined}
                      tabIndex={isInteractive ? 0 : undefined}
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
    </div>
  );
}
