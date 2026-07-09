"use client";

import { useEffect, useState } from "react";
import { ActiveLeadsDashboardCards } from "@/components/admin/active-leads-dashboard-cards";
import { ActiveLeadsQuickFilters } from "@/components/admin/active-leads-quick-filters";
import { SortableActiveLeadsTable } from "@/components/admin/sortable-active-leads-table";
import {
  DEFAULT_ACTIVE_LEADS_QUICK_FILTER,
  type ActiveLeadsDashboardSummary,
  type ActiveLeadsQuickFilter,
  type AdminLeadCrmRow,
} from "@/lib/leads-crm.shared";

interface LeadsListClientProps {
  clubSlug: string;
  leads: AdminLeadCrmRow[];
  dashboard: ActiveLeadsDashboardSummary;
  initialSearchQuery?: string;
}

export function LeadsListClient({
  clubSlug,
  leads,
  dashboard,
  initialSearchQuery = "",
}: LeadsListClientProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [quickFilter, setQuickFilter] = useState<ActiveLeadsQuickFilter>(
    DEFAULT_ACTIVE_LEADS_QUICK_FILTER,
  );

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  return (
    <div className="space-y-5">
      <ActiveLeadsDashboardCards
        dashboard={dashboard}
        activeFilter={quickFilter}
        onFilterSelect={setQuickFilter}
      />

      <ActiveLeadsQuickFilters value={quickFilter} onChange={setQuickFilter} />

      <label className="block max-w-md">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Search leads
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, email, phone, or source"
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white placeholder:text-dojo-muted focus:border-dojo-red/60 focus:outline-none"
        />
      </label>

      <SortableActiveLeadsTable
        clubSlug={clubSlug}
        leads={leads}
        searchQuery={searchQuery}
        quickFilter={quickFilter}
      />
    </div>
  );
}
