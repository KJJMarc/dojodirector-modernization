import type { GridCell } from "@/lib/attendance-card";

export type AttendanceGridDensity = "standard" | "compact";

const GRID_DENSITY = {
  standard: {
    monthCol: "w-[4rem] min-w-[4rem] max-w-[4rem]",
    dayCol: "w-[1.75rem]",
    tableWidth:
      "w-[calc(4rem+31*1.75rem)]" as const,
  },
  compact: {
    monthCol: "w-[3.5rem] min-w-[3.5rem] max-w-[3.5rem]",
    dayCol: "w-[1.5rem]",
    tableWidth:
      "w-[calc(3.5rem+31*1.5rem)]" as const,
  },
} satisfies Record<
  AttendanceGridDensity,
  { monthCol: string; dayCol: string; tableWidth: string }
>;

export function getAttendanceGridDensityConfig(density: AttendanceGridDensity) {
  return GRID_DENSITY[density];
}

function monthColumnSurface(density: AttendanceGridDensity) {
  const { monthCol } = getAttendanceGridDensityConfig(density);
  return `${monthCol} border-r border-neutral-300 bg-neutral-200`;
}

/** Scroll host: bounded to card; table scrolls here when wider than viewport. */
export const attendanceGridScrollClassName =
  "attendance-card-grid-scroll w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] print:overflow-visible";

/** White frame hugs table width exactly (no stretch past day 31). */
export const attendanceGridSurfaceClassName =
  "attendance-card-grid block w-max overflow-hidden rounded-md border border-neutral-300 bg-white text-neutral-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] print:w-full print:max-w-none print:border-neutral-400 print:shadow-none";

export const attendanceCardComposedInnerClassName =
  "flex w-max max-w-full min-w-0 flex-col gap-1.5";

export function attendanceGridTableClassName(density: AttendanceGridDensity = "standard") {
  const { tableWidth } = getAttendanceGridDensityConfig(density);
  return `${tableWidth} table-fixed border-collapse border border-neutral-300 text-[11px] leading-tight sm:text-xs print:w-full print:max-w-none print:border-neutral-400 print:text-[10px]`;
}

export const attendanceCardSectionClassName =
  "min-w-0 max-w-full space-y-2 rounded-xl border border-dojo-border bg-dojo-surface p-3 sm:p-4";

export const attendanceCardMetaGridClassName =
  "grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4 md:grid-cols-4";

export const attendanceCardHeaderRowClassName =
  "flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between";

export const studentPortalAttendanceMainClassName =
  "mx-auto min-h-screen w-full max-w-7xl space-y-6 overflow-x-hidden px-3 py-4 pb-20 sm:px-5";

export const attendanceGridDayHeaderClassName =
  "border-b border-neutral-300 border-r border-neutral-200 bg-neutral-50 px-0 py-1.5 text-center text-[11px] font-medium tabular-nums text-neutral-600 last:border-r-0 sm:py-2";

export function attendanceGridColumnHeaderClassName(
  density: AttendanceGridDensity = "standard",
) {
  return `sticky left-0 z-20 ${monthColumnSurface(density)} px-2 py-2 text-left text-xs font-semibold tracking-wide text-neutral-700 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.08)] print:bg-neutral-200 print:shadow-none`;
}

export function attendanceGridMonthLabelClassName(
  _monthIndex: number,
  density: AttendanceGridDensity = "standard",
) {
  return `sticky left-0 z-10 ${monthColumnSurface(density)} px-2 py-1.5 text-left text-xs font-semibold text-neutral-700 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.06)] print:bg-neutral-200 print:shadow-none`;
}

export function attendanceGridMonthRowClassName(monthIndex: number) {
  return monthIndex % 2 === 1 ? "bg-neutral-50/35" : "bg-white";
}

export const attendanceGridInvalidDayClassName =
  "cursor-not-allowed bg-neutral-200 bg-[repeating-linear-gradient(135deg,transparent_0,transparent_5px,rgba(163,163,163,0.14)_5px_6px)] text-transparent print:cursor-default print:bg-neutral-200 print:bg-none";

export const attendanceLegendAttendedSwatchClassName =
  "inline-flex h-5 w-5 items-center justify-center rounded-sm border border-[#c5d6cb] bg-[#eef4f0] text-[11px] font-semibold text-[#2f4f3a]";

export const attendanceLegendGradingSwatchClassName =
  "inline-flex h-5 w-5 items-center justify-center rounded-sm border border-[#e0d6c4] bg-[#f7f4ed] text-[11px] font-semibold text-[#5c4e32]";

export function attendanceGridDayCellClassName(
  cell: GridCell,
  isValidDay: boolean,
  options?: { isInteractive?: boolean },
) {
  if (!isValidDay) {
    return attendanceGridInvalidDayClassName;
  }

  if (cell === "G") {
    return "bg-[#f7f4ed] font-semibold text-[#5c4e32] print:bg-[#f7f4ed]";
  }

  if (cell === "X") {
    return [
      "bg-[#eef4f0] font-semibold text-[#2f4f3a]",
      options?.isInteractive
        ? "cursor-pointer hover:bg-[#e3ece6] print:cursor-auto print:hover:bg-[#eef4f0]"
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    "text-neutral-300",
    options?.isInteractive
      ? "cursor-pointer hover:bg-neutral-100 hover:text-neutral-500 print:cursor-auto print:hover:bg-inherit"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const attendanceGridDayCellBaseClassName =
  "border-b border-r border-neutral-200 px-0 py-1 text-center align-middle last:border-r-0 sm:py-1.5";

export const attendanceGridEditHintClassName =
  "box-border w-full border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] leading-snug text-neutral-500 print:hidden";
