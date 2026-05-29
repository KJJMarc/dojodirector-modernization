import { GridCell, YearlyGridRow } from "@/lib/attendance-card";

interface YearlyAttendanceGridProps {
  rows: YearlyGridRow[];
  year: number;
}

function cellClassName(cell: GridCell, isValidDay: boolean) {
  if (!isValidDay) {
    return "bg-neutral-100 text-transparent print:bg-neutral-200";
  }

  if (cell === "G") {
    return "bg-amber-100 font-bold text-amber-900 print:bg-amber-50";
  }

  if (cell === "X") {
    return "font-semibold text-neutral-900";
  }

  return "text-neutral-300";
}

export function YearlyAttendanceGrid({ rows, year }: YearlyAttendanceGridProps) {
  return (
    <div className="attendance-card-grid overflow-x-auto rounded-lg border border-dojo-border bg-white text-neutral-900 print:overflow-visible print:border-neutral-400">
      <table className="w-full min-w-[720px] border-collapse text-[10px] leading-none sm:text-xs">
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

                  return (
                    <td
                      key={`${row.month}-${day}`}
                      className={`border-r border-neutral-200 px-0.5 py-1 text-center last:border-r-0 ${cellClassName(
                        cell,
                        isValidDay,
                      )}`}
                      aria-label={
                        isValidDay
                          ? `${row.monthLabel} ${day}: ${cell || "no attendance"}`
                          : undefined
                      }
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
