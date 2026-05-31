import {
  getAttendanceGridDensityConfig,
  type AttendanceGridDensity,
} from "@/components/attendance/yearly-attendance-grid.shared";

interface AttendanceGridColGroupProps {
  density?: AttendanceGridDensity;
}

/** Fixed column widths: month + 31 day columns (grid ends at day 31). */
export function AttendanceGridColGroup({
  density = "standard",
}: AttendanceGridColGroupProps) {
  const { monthCol, dayCol } = getAttendanceGridDensityConfig(density);

  return (
    <colgroup>
      <col className={monthCol} />
      {Array.from({ length: 31 }, (_, index) => (
        <col key={index} className={dayCol} />
      ))}
    </colgroup>
  );
}
