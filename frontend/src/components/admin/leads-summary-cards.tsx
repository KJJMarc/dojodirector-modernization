import type { AdminLeadHistorySummary, AdminLeadsSummary } from "@/lib/leads.shared";

interface LeadsSummaryCardsProps {
  summary: AdminLeadsSummary;
  totalActiveLeads?: number;
  allTimeSummary?: AdminLeadHistorySummary;
}

const cardClassName =
  "rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 text-left";

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={cardClassName}>
      <p className="text-xs font-medium uppercase tracking-wide text-dojo-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-dojo-white">{value}</p>
    </div>
  );
}

export function LeadsSummaryCards({
  summary,
  totalActiveLeads,
  allTimeSummary,
}: LeadsSummaryCardsProps) {
  if (!allTimeSummary) {
    const pipelineItems = [
      { label: "New Leads", value: summary.newLeads },
      { label: "Needs Follow Up", value: summary.needsFollowUp },
      { label: "Trial Booked", value: summary.trialBooked },
      { label: "Joined This Month", value: summary.joinedThisMonth },
    ];

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pipelineItems.map((item) => (
          <SummaryCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section aria-label="Active pipeline summary" className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-dojo-red">
          Active pipeline
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total Active Leads"
            value={totalActiveLeads ?? summary.newLeads + summary.trialBooked}
          />
          <SummaryCard label="New Leads" value={summary.newLeads} />
          <SummaryCard label="Needs Follow Up" value={summary.needsFollowUp} />
          <SummaryCard label="Trial Booked" value={summary.trialBooked} />
        </div>
      </section>

      <section aria-label="All-time lead summary" className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-dojo-red">All-time</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard label="Total Joined Leads" value={allTimeSummary.joinedLeads} />
          <SummaryCard label="Joined This Month" value={summary.joinedThisMonth} />
          <SummaryCard
            label="All-Time Conversion Rate"
            value={allTimeSummary.conversionRateLabel}
          />
        </div>
      </section>
    </div>
  );
}
