import type { AdminLeadHistorySummary } from "@/lib/leads.shared";

interface LeadHistorySummaryCardsProps {
  summary: AdminLeadHistorySummary;
}

const cardClassName =
  "rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 text-left";

export function LeadHistorySummaryCards({ summary }: LeadHistorySummaryCardsProps) {
  const items = [
    { label: "Total Leads Ever", value: summary.totalLeads },
    { label: "Joined Leads", value: summary.joinedLeads },
    { label: "Trial Attended", value: summary.trialAttended },
    { label: "Trial Booked", value: summary.trialBooked },
    { label: "Trial Missed", value: summary.trialMissed },
    { label: "New Enquiries", value: summary.newEnquiries },
    { label: "Archived Leads", value: summary.archivedLeads },
    { label: "Conversion to Joined", value: summary.conversionRateLabel },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={cardClassName}>
          <p className="text-xs font-medium uppercase tracking-wide text-dojo-muted">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-dojo-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
