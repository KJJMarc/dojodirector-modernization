"use client";

import {
  ACTIVE_LEADS_QUICK_FILTERS,
  type ActiveLeadsQuickFilter,
} from "@/lib/leads-crm.shared";

interface ActiveLeadsQuickFiltersProps {
  value: ActiveLeadsQuickFilter;
  onChange: (value: ActiveLeadsQuickFilter) => void;
}

export function ActiveLeadsQuickFilters({ value, onChange }: ActiveLeadsQuickFiltersProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="toolbar"
      aria-label="Active leads filters"
    >
      {ACTIVE_LEADS_QUICK_FILTERS.map((filter) => {
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
