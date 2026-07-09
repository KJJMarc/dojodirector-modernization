"use client";

import type { LeadHistoryMonthMetrics } from "@/lib/lead-history-report.shared";

interface LeadHistoryMonthTableProps {
  rows: LeadHistoryMonthMetrics[];
  selectedMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
}

export function LeadHistoryMonthTable({
  rows,
  selectedMonthKey,
  onSelectMonth,
}: LeadHistoryMonthTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No monthly data matches your filters.
      </p>
    );
  }

  return (
    <section aria-label="Month by month report" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Month by month
        </h2>
        <p className="mt-1 text-sm text-dojo-muted">
          Click a month to drill down into the leads submitted that month.
        </p>
      </div>

      <div className="overflow-auto rounded-xl border border-dojo-border bg-dojo-surface">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-dojo-border bg-dojo-elevated text-xs uppercase tracking-wide text-dojo-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Month</th>
              <th className="px-3 py-3 font-semibold">Total leads</th>
              <th className="px-3 py-3 font-semibold">Trials booked</th>
              <th className="px-3 py-3 font-semibold">Trials attended</th>
              <th className="px-3 py-3 font-semibold">Joined</th>
              <th className="px-3 py-3 font-semibold">Trial missed</th>
              <th className="px-3 py-3 font-semibold">Conversion rate</th>
              <th className="px-3 py-3 font-semibold">Top lead source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dojo-border">
            {rows.map((row) => {
              const isSelected = row.monthKey === selectedMonthKey;

              return (
                <tr
                  key={row.monthKey}
                  className={isSelected ? "bg-dojo-red/10 text-dojo-white" : "text-dojo-white"}
                >
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSelectMonth(row.monthKey)}
                      className={`font-medium transition hover:text-dojo-red ${
                        isSelected ? "text-dojo-red" : "text-dojo-white"
                      }`}
                    >
                      {row.monthLabel}
                    </button>
                  </td>
                  <td className="px-3 py-3">{row.totalLeads}</td>
                  <td className="px-3 py-3">{row.trialsBooked}</td>
                  <td className="px-3 py-3">{row.trialsAttended}</td>
                  <td className="px-3 py-3">{row.joined}</td>
                  <td className="px-3 py-3">{row.trialsMissed}</td>
                  <td className="px-3 py-3">{row.conversionRateLabel}</td>
                  <td className="px-3 py-3 text-dojo-muted">{row.topLeadSource}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
