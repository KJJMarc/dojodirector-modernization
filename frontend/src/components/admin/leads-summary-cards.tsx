import type { AdminLeadsSummary } from "@/lib/leads.shared";

interface LeadsSummaryCardsProps {
  summary: AdminLeadsSummary;
}

const cardClassName =
  "rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 text-left";

export function LeadsSummaryCards({ summary }: LeadsSummaryCardsProps) {
  const items = [
    { label: "New Leads", value: summary.newLeads },
    { label: "Needs Follow Up", value: summary.needsFollowUp },
    { label: "Trial Booked", value: summary.trialBooked },
    { label: "Joined This Month", value: summary.joinedThisMonth },
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
