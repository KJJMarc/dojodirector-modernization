import { AttendanceCounts } from "@/lib/attendance-ui";

interface AttendanceSummaryProps {
  counts: AttendanceCounts;
  compact?: boolean;
}

const items: { key: keyof AttendanceCounts; label: string }[] = [
  { key: "booked", label: "Booked" },
  { key: "present", label: "Present" },
  { key: "absent", label: "Absent" },
  { key: "unmarked", label: "Unmarked" },
];

export function AttendanceSummary({
  counts,
  compact = false,
}: AttendanceSummaryProps) {
  return (
    <div
      className={`grid grid-cols-4 gap-2 ${compact ? "" : "rounded-xl border border-dojo-border bg-dojo-surface p-2.5"}`}
      role="group"
      aria-label="Attendance summary"
    >
      {items.map(({ key, label }) => (
        <div
          key={key}
          className={`text-center ${compact ? "rounded-lg bg-dojo-elevated px-1 py-1.5" : ""}`}
        >
          <p
            className={`font-semibold tabular-nums text-dojo-white ${compact ? "text-sm" : "text-lg"}`}
          >
            {counts[key]}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-dojo-muted">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
