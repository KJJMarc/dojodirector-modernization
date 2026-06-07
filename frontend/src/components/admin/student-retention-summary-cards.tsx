import {
  buildStudentRetentionRiskSummary,
  type AdminStudentRetentionRow,
} from "@/lib/admin-student-retention.shared";

interface StudentRetentionSummaryCardsProps {
  rows: AdminStudentRetentionRow[];
}

const cardClassName =
  "rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 text-left";

export function StudentRetentionSummaryCards({
  rows,
}: StudentRetentionSummaryCardsProps) {
  const summary = buildStudentRetentionRiskSummary(rows);

  const items = [
    {
      label: "Active students",
      value: summary.totalActiveStudents,
      valueClassName: "text-dojo-white",
    },
    {
      label: "High risk",
      value: summary.redCount,
      valueClassName: "text-dojo-red",
    },
    {
      label: "Medium risk",
      value: summary.amberCount,
      valueClassName: "text-amber-300",
    },
    {
      label: "Low risk",
      value: summary.greenCount,
      valueClassName: "text-emerald-400",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={cardClassName}>
          <p className="text-xs font-medium uppercase tracking-wide text-dojo-muted">
            {item.label}
          </p>
          <p className={`mt-1 text-2xl font-semibold ${item.valueClassName}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
