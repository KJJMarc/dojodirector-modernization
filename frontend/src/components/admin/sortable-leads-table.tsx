"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LeadRowActions } from "@/components/admin/lead-row-actions";
import { LeadStatusLabel } from "@/components/admin/lead-status-label";
import {
  applyAdminLeadsListView,
  DEFAULT_ADMIN_LEADS_LIST_SORT,
  getNextAdminLeadsListSortDir,
  resolveLeadTrialSortDate,
  type AdminLeadsListSort,
  type AdminLeadsListSortKey,
} from "@/lib/leads-list-sort.shared";
import {
  readAdminLeadsListSortFromStorage,
  writeAdminLeadsListSortToStorage,
} from "@/lib/leads-list-sort.storage";
import {
  clubLeadDetailAdminPath,
  formatAdminLeadDate,
  formatAdminLeadDateTime,
  formatLeadFollowUpStatusLabel,
  formatLeadProgrammeInterestLabel,
  type AdminLeadListRow,
} from "@/lib/leads.shared";

interface SortableLeadsTableProps {
  clubSlug: string;
  leads: AdminLeadListRow[];
  searchQuery?: string;
}

const SORTABLE_COLUMNS: {
  key: AdminLeadsListSortKey;
  label: string;
  className: string;
}[] = [
  { key: "name", label: "Name", className: "w-[14%] min-w-[9rem]" },
  { key: "status", label: "Status", className: "w-[9%] min-w-[7rem]" },
  { key: "follow_up_date", label: "Follow-up", className: "w-[9%] min-w-[7rem]" },
  { key: "trial_date", label: "Trial Date", className: "w-[8%] min-w-[6.5rem]" },
  { key: "joined_date", label: "Joined", className: "w-[8%] min-w-[6.5rem]" },
  { key: "submitted_date", label: "Submitted", className: "w-[8%] min-w-[6.5rem]" },
  { key: "lead_source", label: "Source", className: "w-[8%] min-w-[6rem]" },
  { key: "programme_interest", label: "Programme", className: "w-[9%] min-w-[7rem]" },
  { key: "last_activity", label: "Last Activity", className: "w-[10%] min-w-[7.5rem]" },
  { key: "last_updated", label: "Last Updated", className: "w-[9%] min-w-[7.5rem]" },
];

function SortIndicator({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: AdminLeadsListSort["dir"];
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
  columnKey: AdminLeadsListSortKey;
  label: string;
  className: string;
  currentSort: AdminLeadsListSort;
  onSort: (columnKey: AdminLeadsListSortKey) => void;
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

export function SortableLeadsTable({
  clubSlug,
  leads,
  searchQuery = "",
}: SortableLeadsTableProps) {
  const [currentSort, setCurrentSort] = useState<AdminLeadsListSort>(
    DEFAULT_ADMIN_LEADS_LIST_SORT,
  );
  const [sortReady, setSortReady] = useState(false);

  useEffect(() => {
    setCurrentSort(readAdminLeadsListSortFromStorage(clubSlug));
    setSortReady(true);
  }, [clubSlug]);

  const visibleLeads = useMemo(
    () =>
      applyAdminLeadsListView({
        leads,
        sort: currentSort,
        query: searchQuery,
      }),
    [leads, currentSort, searchQuery],
  );

  const handleSort = (columnKey: AdminLeadsListSortKey) => {
    setCurrentSort((previousSort) => {
      const nextSort: AdminLeadsListSort = {
        key: columnKey,
        dir: getNextAdminLeadsListSortDir(previousSort, columnKey),
      };

      writeAdminLeadsListSortToStorage(clubSlug, nextSort);

      return nextSort;
    });
  };

  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No leads yet.
      </p>
    );
  }

  const isSearchFiltered = Boolean(searchQuery.trim());

  return (
    <section aria-label="Leads list" className="space-y-3">
      <p className="text-sm text-dojo-muted">
        {isSearchFiltered
          ? `${visibleLeads.length} of ${leads.length} leads match your search.`
          : `${leads.length} leads.`}
        {sortReady ? " Click a column header to sort." : null}
      </p>

      {visibleLeads.length === 0 ? (
        <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
          No leads match your search.
        </p>
      ) : (
        <div className="max-h-[min(70vh,48rem)] overflow-auto rounded-xl border border-dojo-border bg-dojo-surface">
          <table className="w-full min-w-[72rem] table-fixed text-left text-sm">
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
                    <Link
                      href={clubLeadDetailAdminPath(clubSlug, lead.id)}
                      className="block truncate font-medium text-dojo-red transition hover:text-dojo-white"
                      title={lead.fullName}
                    >
                      {lead.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <LeadStatusLabel
                      statusLabel={lead.statusLabel}
                      showTrialAttendancePendingWarning={lead.trialAttendancePending}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        lead.followUpStatus === "needs_follow_up"
                          ? "font-medium text-dojo-amber-300"
                          : "text-dojo-muted"
                      }
                    >
                      {formatLeadFollowUpStatusLabel(lead.followUpStatus)}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                    {trialDate ? formatAdminLeadDate(trialDate) : "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                    {lead.joinedAt ? formatAdminLeadDate(lead.joinedAt) : "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                    {formatAdminLeadDate(lead.submittedAt)}
                  </td>
                  <td className="px-3 py-3 truncate text-dojo-muted" title={lead.leadSourceLabel}>
                    {lead.leadSourceLabel}
                  </td>
                  <td className="px-3 py-3 truncate">
                    {formatLeadProgrammeInterestLabel(lead.programmeInterest)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                    {formatAdminLeadDateTime(lead.lastActivityAt)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                    {formatAdminLeadDateTime(lead.updatedAt)}
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
