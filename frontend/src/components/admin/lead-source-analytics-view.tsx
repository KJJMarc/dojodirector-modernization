import type { LeadSourceAnalyticsPageData } from "@/lib/lead-source-analytics.shared";

interface LeadSourceAnalyticsViewProps {
  data: LeadSourceAnalyticsPageData;
}

const TABLE_CLASS =
  "w-full min-w-[640px] border-collapse text-left text-sm text-dojo-white";
const TH_CLASS =
  "border-b border-dojo-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-dojo-muted";
const TD_CLASS = "border-b border-dojo-border/60 px-3 py-2.5";
const TOTAL_ROW_CLASS = "bg-dojo-elevated/40 font-semibold";

function AnalyticsTable({
  ariaLabel,
  headers,
  rows,
  totalRow,
}: {
  ariaLabel: string;
  headers: string[];
  rows: (string | number)[][];
  totalRow: (string | number)[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-dojo-border bg-dojo-surface">
      <table className={TABLE_CLASS} aria-label={ariaLabel}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className={TH_CLASS}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${row[0]}-${cellIndex}`}
                  className={cellIndex === 0 ? `${TD_CLASS} font-medium` : TD_CLASS}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          <tr className={TOTAL_ROW_CLASS}>
            {totalRow.map((cell, cellIndex) => (
              <td
                key={`total-${cellIndex}`}
                className={cellIndex === 0 ? `${TD_CLASS} font-semibold` : TD_CLASS}
              >
                {cell}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function LeadSourceAnalyticsView({ data }: LeadSourceAnalyticsViewProps) {
  const funnelRows = data.funnelRows.map((row) => [
    row.sourceLabel,
    row.leads,
    row.trialBooked,
    row.joined,
    row.conversionPercent,
  ]);

  const qualityRows = data.qualityRows.map((row) => [
    row.sourceLabel,
    row.leads,
    row.members,
    row.activeMembers,
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Lead funnel by source
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-dojo-muted">
            Enquiry volume, trial bookings, and joins grouped by original lead source.
          </p>
        </div>
        <AnalyticsTable
          ariaLabel="Lead funnel by source"
          headers={["Source", "Leads", "Trial Booked", "Joined", "Conversion %"]}
          rows={funnelRows}
          totalRow={[
            "Total",
            data.totals.leads,
            data.totals.trialBooked,
            data.totals.joined,
            data.totals.leads > 0
              ? `${((data.totals.joined / data.totals.leads) * 100).toFixed(1)}%`
              : "—",
          ]}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Student quality by source
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-dojo-muted">
            Members attributed to each source. Active members have an active club membership.
          </p>
        </div>
        <AnalyticsTable
          ariaLabel="Student quality by source"
          headers={["Source", "Leads", "Members", "Active Members"]}
          rows={qualityRows}
          totalRow={[
            "Total",
            data.totals.leads,
            data.totals.members,
            data.totals.activeMembers,
          ]}
        />
      </section>
    </div>
  );
}
