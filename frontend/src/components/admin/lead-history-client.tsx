"use client";

import { useEffect, useState } from "react";
import { SortableLeadHistoryTable } from "@/components/admin/sortable-lead-history-table";
import type { AdminLeadHistoryRow } from "@/lib/leads.shared";

interface LeadHistoryClientProps {
  clubSlug: string;
  leads: AdminLeadHistoryRow[];
  initialSearchQuery?: string;
}

export function LeadHistoryClient({
  clubSlug,
  leads,
  initialSearchQuery = "",
}: LeadHistoryClientProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  return (
    <div className="space-y-4">
      <label className="block max-w-md">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
          Search lead history
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, email, phone, source, programme, or status"
          className="w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white placeholder:text-dojo-muted focus:border-dojo-red/60 focus:outline-none"
        />
      </label>

      <SortableLeadHistoryTable
        clubSlug={clubSlug}
        leads={leads}
        searchQuery={searchQuery}
      />
    </div>
  );
}
