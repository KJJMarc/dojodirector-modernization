"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { GridCell, YearlyGridRow } from "@/lib/attendance-card";
import { isFutureAttendanceDate, formatAttendanceDateKey } from "@/lib/attendance-card-dates";

interface YearlyAttendanceGridProps {
  rows: YearlyGridRow[];
  year: number;
  userId: string;
  toggleAttendanceAction: (formData: FormData) => Promise<void>;
}

function cellClassName(cell: GridCell, isValidDay: boolean, isInteractive: boolean) {
  if (!isValidDay) {
    return "bg-neutral-100 text-transparent print:bg-neutral-200";
  }

  if (cell === "G") {
    return "bg-amber-100 font-bold text-amber-900 print:bg-amber-50";
  }

  if (cell === "X") {
    return [
      "font-semibold text-neutral-900",
      isInteractive
        ? "cursor-pointer hover:bg-red-50 hover:ring-1 hover:ring-red-200 print:cursor-auto print:hover:bg-inherit print:hover:ring-0"
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    "text-neutral-300",
    isInteractive
      ? "cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 print:cursor-auto print:hover:bg-inherit print:hover:ring-0"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
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
  toggleAttendanceAction,
}: YearlyAttendanceGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

    startTransition(async () => {
      await toggleAttendanceAction(formData);
      router.refresh();
    });
  };

  return (
    <div
      className={`attendance-card-grid overflow-x-auto rounded-lg border border-dojo-border bg-white text-neutral-900 print:overflow-visible print:border-neutral-400 ${
        isPending ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <p className="border-b border-neutral-200 px-3 py-2 text-xs text-neutral-600 print:hidden">
        Click a day to add or remove BJJ attendance. Grading days and invalid dates
        cannot be edited here.
      </p>
      <table className="w-full min-w-[720px] border-collapse text-[10px] leading-none sm:text-xs print:pointer-events-none">
        <caption className="sr-only">
          Yearly attendance grid for {year}
        </caption>
        <thead>
          <tr className="border-b border-neutral-300 bg-neutral-50 print:bg-neutral-100">
            <th
              scope="col"
              className="sticky left-0 z-10 border-r border-neutral-300 bg-neutral-50 px-2 py-1.5 text-left font-semibold print:bg-neutral-100"
            >
              Month
            </th>
            {Array.from({ length: 31 }, (_, index) => (
              <th
                key={index + 1}
                scope="col"
                className="min-w-[1.35rem] border-r border-neutral-200 px-0.5 py-1.5 text-center font-semibold last:border-r-0"
              >
                {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const daysInMonth = new Date(year, row.month, 0).getDate();

            return (
              <tr key={row.month} className="border-b border-neutral-200 last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-neutral-300 bg-neutral-50 px-2 py-1 text-left font-semibold print:bg-neutral-100"
                >
                  {row.monthLabel}
                </th>
                {row.days.map((cell, dayIndex) => {
                  const day = dayIndex + 1;
                  const isValidDay = day <= daysInMonth;
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
                      className={`border-r border-neutral-200 px-0.5 py-1 text-center last:border-r-0 ${cellClassName(
                        cell,
                        isValidDay,
                        isInteractive,
                      )}`}
                      aria-label={
                        isValidDay
                          ? `${row.monthLabel} ${day}: ${cell || "no attendance"}`
                          : undefined
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
