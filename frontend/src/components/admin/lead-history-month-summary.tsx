import type { LeadHistoryMonthComparisonMetric } from "@/lib/lead-history-report.shared";
import { formatLeadHistoryMonthLabel } from "@/lib/lead-history-report.shared";

interface LeadHistoryMonthSummaryProps {
  monthKey: string;
  comparison: LeadHistoryMonthComparisonMetric[];
}

const cardClassName =
  "rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 text-left";

export function LeadHistoryMonthSummary({
  monthKey,
  comparison,
}: LeadHistoryMonthSummaryProps) {
  return (
    <section aria-label="Monthly summary" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Monthly summary
        </h2>
        <p className="mt-1 text-sm text-dojo-muted">
          {formatLeadHistoryMonthLabel(monthKey)} compared with the previous month.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {comparison.map((metric) => (
          <div key={metric.label} className={cardClassName}>
            <p className="text-xs font-medium uppercase tracking-wide text-dojo-muted">
              {metric.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-dojo-white">{metric.current}</p>
            <p className="mt-1 text-xs text-dojo-muted">
              vs previous: {metric.previous} ({metric.changeLabel})
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
