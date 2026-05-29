import { AttendanceStatus } from "@/types/database";

const statusStyles: Record<Exclude<AttendanceStatus, null>, string> = {
  present: "bg-dojo-elevated text-dojo-white ring-dojo-border",
  absent: "bg-dojo-elevated text-dojo-muted ring-dojo-border",
};

interface AttendanceStatusChipProps {
  status: AttendanceStatus;
  compact?: boolean;
}

export function AttendanceStatusChip({
  status,
  compact = false,
}: AttendanceStatusChipProps) {
  const size = compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  if (!status) {
    return (
      <span
        className={`rounded font-medium uppercase tracking-wide text-dojo-muted ring-1 ring-dojo-border bg-dojo-black ${size}`}
      >
        Unmarked
      </span>
    );
  }

  return (
    <span
      className={`rounded font-medium capitalize ring-1 ${size} ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
