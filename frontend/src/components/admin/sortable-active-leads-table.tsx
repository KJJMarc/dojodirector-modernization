"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LeadHealthIndicator } from "@/components/admin/lead-health-indicator";
import { LeadRowActions } from "@/components/admin/lead-row-actions";
import { LeadStatusLabel } from "@/components/admin/lead-status-label";
import {
  applyActiveLeadsCrmListView,
  DEFAULT_ACTIVE_LEADS_CRM_SORT,
  getNextActiveLeadsCrmSortDir,
  type ActiveLeadsCrmSort,
  type ActiveLeadsCrmSortKey,
} from "@/lib/leads-crm-list-sort.shared";
import {
  readActiveLeadsCrmSortFromStorage,
  writeActiveLeadsCrmSortToStorage,
} from "@/lib/leads-crm-list-sort.storage";
import type { ActiveLeadsQuickFilter, AdminLeadCrmRow } from "@/lib/leads-crm.shared";
import { resolveLeadTrialSortDate } from "@/lib/leads-list-sort.shared";
import {
  clubLeadDetailAdminPath,
  formatAdminLeadDate,
  formatAdminLeadDateTime,
} from "@/lib/leads.shared";

interface SortableActiveLeadsTableProps {
  clubSlug: string;
  leads: AdminLeadCrmRow[];
  searchQuery?: string;
  quickFilter?: ActiveLeadsQuickFilter;
}

const SORTABLE_COLUMNS: {
  key: ActiveLeadsCrmSortKey;
  label: string;
  className: string;
}[] = [
  { key: "lead_health", label: "Health", className: "w-[10%] min-w-[7.5rem]" },
  { key: "name", label: "Name", className: "w-[14%] min-w-[9rem]" },
  { key: "status", label: "Status", className: "w-[9%] min-w-[7rem]" },
  { key: "last_contact", label: "Last Contact", className: "w-[9%] min-w-[7rem]" },
  { key: "next_follow_up", label: "Next Follow-up", className: "w-[10%] min-w-[7.5rem]" },
  { key: "contact_attempts", label: "Attempts", className: "w-[7%] min-w-[5.5rem]" },
  { key: "trial_date", label: "Trial Date", className: "w-[8%] min-w-[6.5rem]" },
  { key: "last_activity", label: "Last Activity", className: "w-[10%] min-w-[7.5rem]" },
];

function SortIndicator({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: ActiveLeadsCrmSort["dir"];
}) {
  return (
    <span
      className="inline-flex w-3 shrink-0 items-center justify-center text-dojo-red"
      aria-hidden="true"
    >
      {isActive ? (direction === "asc" ? "▲" : "▼") : ""}
    </span>
  );
}

function SortableHeader({
  columnKey,
  label,
  className,
  currentSort,
  onSort,
}: {
  columnKey: ActiveLeadsCrmSortKey;
  label: string;
  className: string;
  currentSort: ActiveLeadsCrmSort;
  onSort: (columnKey: ActiveLeadsCrmSortKey) => void;
}) {
  const isActive = currentSort.key === columnKey;

  return (
    <th
      className={`sticky top-0 z-10 bg-dojo-elevated px-3 py-3 font-semibold align-middle ${className}`}
      scope="col"
      aria-sort={
        isActive ? (currentSort.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex w-full items-center gap-1 whitespace-nowrap text-left transition hover:text-dojo-white ${
          isActive ? "text-dojo-white" : "text-dojo-muted"
        }`}
      >
        <span>{label}</span>
        <SortIndicator isActive={isActive} direction={currentSort.dir} />
      </button>
    </th>
  );
}

export function SortableActiveLeadsTable({
  clubSlug,
  leads,
  searchQuery = "",
  quickFilter = "all",
}: SortableActiveLeadsTableProps) {
  const [currentSort, setCurrentSort] = useState<ActiveLeadsCrmSort>(
    DEFAULT_ACTIVE_LEADS_CRM_SORT,
  );
  const [sortReady, setSortReady] = useState(false);

  useEffect(() => {
    setCurrentSort(readActiveLeadsCrmSortFromStorage(clubSlug));
    setSortReady(true);
  }, [clubSlug]);

  const visibleLeads = useMemo(
    () =>
      applyActiveLeadsCrmListView({
        leads,
        sort: currentSort,
        query: searchQuery,
        quickFilter,
      }),
    [leads, currentSort, searchQuery, quickFilter],
  );

  const handleSort = (columnKey: ActiveLeadsCrmSortKey) => {
    setCurrentSort((previousSort) => {
      const nextSort: ActiveLeadsCrmSort = {
        key: columnKey,
        dir: getNextActiveLeadsCrmSortDir(previousSort, columnKey),
      };

      writeActiveLeadsCrmSortToStorage(clubSlug, nextSort);

      return nextSort;
    });
  };

  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No active leads yet.
      </p>
    );
  }

  const isFiltered = Boolean(searchQuery.trim()) || quickFilter !== "all";

  return (
    <section aria-label="Active leads list" className="space-y-3">
      <p className="text-sm text-dojo-muted">
        {isFiltered
          ? `${visibleLeads.length} of ${leads.length} leads match your filters.`
          : `${leads.length} active leads.`}
        {sortReady ? " Sorted by urgency first — click a column header to re-sort." : null}
      </p>

      {visibleLeads.length === 0 ? (
        <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
          No leads match your filters.
        </p>
      ) : (
        <div className="max-h-[min(70vh,48rem)] overflow-auto rounded-xl border border-dojo-border bg-dojo-surface">
          <table className="w-full min-w-[68rem] table-fixed text-left text-sm">
            <thead className="border-b border-dojo-border bg-dojo-elevated text-xs uppercase tracking-wide">
              <tr>
                {SORTABLE_COLUMNS.map(({ key, label, className }) => (
                  <SortableHeader
                    key={key}
                    columnKey={key}
                    label={label}
                    className={className}
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                ))}
                <th
                  className="sticky top-0 z-10 w-[8%] min-w-[11rem] whitespace-nowrap bg-dojo-elevated px-3 py-3 font-semibold"
                  scope="col"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dojo-border">
              {visibleLeads.map((lead) => {
                const trialDate = resolveLeadTrialSortDate(lead);

                return (
                  <tr key={lead.id} className="text-dojo-white">
                    <td className="px-3 py-3">
                      <LeadHealthIndicator
                        health={lead.leadHealth}
                        label={lead.healthLabel}
                        compact
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={clubLeadDetailAdminPath(clubSlug, lead.id)}
                        className="block truncate font-medium text-dojo-red transition hover:text-dojo-white"
                        title={lead.fullName}
                      >
                        {lead.fullName}
                      </Link>
                      {lead.bannerLabel ? (
                        <p className="mt-1 truncate text-xs text-dojo-muted">{lead.bannerLabel}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <LeadStatusLabel
                        statusLabel={lead.statusLabel}
                        showTrialAttendancePendingWarning={lead.trialAttendancePending}
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {lead.lastContactedAt ? formatAdminLeadDate(lead.lastContactedAt) : "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {lead.nextFollowUpAt ? formatAdminLeadDate(lead.nextFollowUpAt) : "—"}
                    </td>
                    <td className="px-3 py-3 text-dojo-muted">{lead.contactAttempts}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {trialDate ? formatAdminLeadDate(trialDate) : "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {formatAdminLeadDateTime(lead.lastActivityAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <LeadRowActions
                        clubSlug={clubSlug}
                        leadId={lead.id}
                        leadName={lead.fullName}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
