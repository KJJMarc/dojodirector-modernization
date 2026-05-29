import { AttendanceCounts } from "@/lib/attendance-ui";

interface AttendanceSummaryProps {
  counts: AttendanceCounts;
  compact?: boolean;
}

const items: {
  key: keyof AttendanceCounts;
  label: string;
  valueClass?: string;
}[] = [
  { key: "booked", label: "Booked" },
  { key: "present", label: "Present", valueClass: "text-green-500" },
  { key: "absent", label: "Absent", valueClass: "text-dojo-red" },
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
      {items.map(({ key, label, valueClass }) => (
        <div
          key={key}
          className={`text-center ${compact ? "rounded-lg bg-dojo-elevated px-1 py-1.5" : ""}`}
        >
          <p
            className={`font-semibold tabular-nums ${valueClass ?? "text-dojo-white"} ${compact ? "text-sm" : "text-lg"}`}
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
