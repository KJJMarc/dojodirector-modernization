"use client";

import {
  LEAD_HISTORY_QUICK_FILTERS,
  type LeadHistoryQuickFilter,
} from "@/lib/lead-history-report.shared";

interface LeadHistoryQuickFiltersProps {
  value: LeadHistoryQuickFilter;
  onChange: (value: LeadHistoryQuickFilter) => void;
}

export function LeadHistoryQuickFilters({ value, onChange }: LeadHistoryQuickFiltersProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="toolbar"
      aria-label="Quick lead history filters"
    >
      {LEAD_HISTORY_QUICK_FILTERS.map((filter) => {
        const isActive = value === filter.key;

        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onChange(filter.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              isActive
                ? "border-dojo-red/60 bg-dojo-red/15 text-dojo-white"
                : "border-dojo-border bg-dojo-elevated text-dojo-muted hover:border-dojo-red/40 hover:text-dojo-white"
            }`}
            aria-pressed={isActive}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
