import type { LeadHistoryChartPoint } from "@/lib/lead-history-report.shared";

interface LeadHistoryTrendChartsProps {
  points: LeadHistoryChartPoint[];
}

function BarChart({
  title,
  points,
  valueKey,
  maxValue,
  valueFormatter,
}: {
  title: string;
  points: LeadHistoryChartPoint[];
  valueKey: keyof Pick<LeadHistoryChartPoint, "totalLeads" | "joined" | "conversionRatePercent">;
  maxValue: number;
  valueFormatter: (value: number) => string;
}) {
  return (
    <div className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">{title}</h3>
      <div className="mt-4 space-y-2">
        {points.map((point) => {
          const value = point[valueKey];
          const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div key={`${title}-${point.monthKey}`} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2">
              <span className="truncate text-xs text-dojo-muted">{point.monthLabel}</span>
              <div className="h-3 rounded-full bg-dojo-elevated">
                <div
                  className="h-3 rounded-full bg-dojo-red/80"
                  style={{ width: `${Math.max(widthPercent, value > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-dojo-white">{valueFormatter(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeadHistoryTrendCharts({ points }: LeadHistoryTrendChartsProps) {
  if (points.length === 0) {
    return null;
  }

  const maxLeads = Math.max(...points.map((point) => point.totalLeads), 1);
  const maxJoined = Math.max(...points.map((point) => point.joined), 1);
  const maxConversion = Math.max(...points.map((point) => point.conversionRatePercent), 1);

  return (
    <section aria-label="Lead history trends" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">Trends</h2>
        <p className="mt-1 text-sm text-dojo-muted">
          Leads use submission month. Joined uses joined month. Conversion is cohort conversion
          from each submission month.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BarChart
          title="Leads per month"
          points={points}
          valueKey="totalLeads"
          maxValue={maxLeads}
          valueFormatter={(value) => String(value)}
        />
        <BarChart
          title="Joined per month"
          points={points}
          valueKey="joined"
          maxValue={maxJoined}
          valueFormatter={(value) => String(value)}
        />
        <BarChart
          title="Conversion rate"
          points={points}
          valueKey="conversionRatePercent"
          maxValue={maxConversion}
          valueFormatter={(value) => `${value.toFixed(1)}%`}
        />
      </div>
    </section>
  );
}
