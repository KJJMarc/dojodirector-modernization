import type { ReactNode } from "react";
import { attendanceGridSurfaceClassName } from "@/components/attendance/yearly-attendance-grid.shared";

interface AttendanceCardGridShellProps {
  children: ReactNode;
  /** Shown directly above the table, inside the white grid frame (matches table width). */
  gridHeader?: ReactNode;
}

export function AttendanceCardGridShell({
  children,
  gridHeader,
}: AttendanceCardGridShellProps) {
  return (
    <div className={attendanceGridSurfaceClassName}>
      {gridHeader}
      {children}
    </div>
  );
}
