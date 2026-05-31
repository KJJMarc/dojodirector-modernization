import type { ReactNode } from "react";
import {
  attendanceCardHeaderRowClassName,
  attendanceCardMetaGridClassName,
} from "@/components/attendance/yearly-attendance-grid.shared";

export function AttendanceCardMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-dojo-muted print:text-neutral-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-dojo-muted print:text-neutral-700">
        {value}
      </p>
    </div>
  );
}

export function AttendanceCardMetaGrid({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={attendanceCardMetaGridClassName}>{children}</div>;
}

export { attendanceCardHeaderRowClassName };
