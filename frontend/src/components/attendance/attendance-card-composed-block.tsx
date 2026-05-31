import type { ReactNode } from "react";
import {
  attendanceCardComposedInnerClassName,
  attendanceGridScrollClassName,
} from "@/components/attendance/yearly-attendance-grid.shared";

interface AttendanceCardComposedBlockProps {
  children: ReactNode;
}

/** Aligns header, legend, and grid to the same width; scrolls as one unit when needed. */
export function AttendanceCardComposedBlock({
  children,
}: AttendanceCardComposedBlockProps) {
  return (
    <div
      className={attendanceGridScrollClassName}
      role="region"
      aria-label="Attendance card content"
    >
      <div className={attendanceCardComposedInnerClassName}>{children}</div>
    </div>
  );
}
