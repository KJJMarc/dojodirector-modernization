"use client";

import type { ActiveLeadsDashboardSummary, ActiveLeadsQuickFilter } from "@/lib/leads-crm.shared";

interface ActiveLeadsDashboardCardsProps {
  dashboard: ActiveLeadsDashboardSummary;
  activeFilter?: ActiveLeadsQuickFilter;
  onFilterSelect?: (filter: ActiveLeadsQuickFilter) => void;
}

const cardClassName =
  "rounded-xl border border-dojo-border bg-dojo-surface px-4 py-3 text-left transition hover:border-dojo-red/40";

function DashboardCard({
  label,
  value,
  isActive,
  onClick,
}: {
  label: string;
  value: number;
  isActive: boolean;
  onClick?: () => void;
}) {
  const className = `${cardClassName} ${isActive ? "border-dojo-red/60 bg-dojo-red/10" : ""}`;

  if (!onClick) {
    return (
      <div className={className}>
        <p className="text-xs font-medium uppercase tracking-wide text-dojo-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-dojo-white">{value}</p>
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-pressed={isActive}>
      <p className="text-xs font-medium uppercase tracking-wide text-dojo-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-dojo-white">{value}</p>
    </button>
  );
}

export function ActiveLeadsDashboardCards({
  dashboard,
  activeFilter,
  onFilterSelect,
}: ActiveLeadsDashboardCardsProps) {
  const cards: {
    filterKey: ActiveLeadsQuickFilter;
    label: string;
    value: number;
  }[] = [
    {
      filterKey: "needs_follow_up_today",
      label: "Needs Follow-up Today",
      value: dashboard.needsFollowUpToday,
    },
    { filterKey: "overdue", label: "Overdue", value: dashboard.overdue },
    { filterKey: "booked_this_week", label: "Booked This Week", value: dashboard.bookedThisWeek },
    { filterKey: "joined_this_month", label: "Joined This Month", value: dashboard.joinedThisMonth },
    { filterKey: "no_contact_yet", label: "No Contact Made", value: dashboard.noContactMade },
    { filterKey: "awaiting_trial", label: "Awaiting Trial", value: dashboard.awaitingTrial },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const isActive = activeFilter === card.filterKey;

        return (
          <DashboardCard
            key={card.label}
            label={card.label}
            value={card.value}
            isActive={isActive}
            onClick={
              onFilterSelect
                ? () => onFilterSelect(isActive ? "all" : card.filterKey)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
