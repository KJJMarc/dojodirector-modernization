"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LeadStatusLabel } from "@/components/admin/lead-status-label";
import {
  applyAdminLeadHistoryView,
  DEFAULT_ADMIN_LEAD_HISTORY_SORT,
  getNextAdminLeadHistorySortDir,
  resolveLeadFollowUpDisplayDate,
  resolveLeadTrialBookedDate,
  type AdminLeadHistorySort,
  type AdminLeadHistorySortKey,
} from "@/lib/lead-history-sort.shared";
import {
  readAdminLeadHistorySortFromStorage,
  writeAdminLeadHistorySortToStorage,
} from "@/lib/lead-history-sort.storage";
import {
  clubLeadDetailAdminPath,
  formatAdminLeadDate,
  formatAdminLeadDateTime,
  formatLeadProgrammeInterestLabel,
  type AdminLeadHistoryRow,
} from "@/lib/leads.shared";

interface SortableLeadHistoryTableProps {
  clubSlug: string;
  leads: AdminLeadHistoryRow[];
  searchQuery?: string;
}

const SORTABLE_COLUMNS: {
  key: AdminLeadHistorySortKey;
  label: string;
  className: string;
}[] = [
  { key: "name", label: "Name", className: "w-[12%] min-w-[9rem]" },
  { key: "status", label: "Status", className: "w-[10%] min-w-[7.5rem]" },
  { key: "lead_source", label: "Lead Source", className: "w-[8%] min-w-[6.5rem]" },
  { key: "programme_interest", label: "Programme", className: "w-[9%] min-w-[7rem]" },
  { key: "submitted_date", label: "Submitted", className: "w-[8%] min-w-[6.5rem]" },
  { key: "trial_date", label: "Trial Date", className: "w-[8%] min-w-[6.5rem]" },
  {
    key: "trial_attended_date",
    label: "Trial Attended",
    className: "w-[8%] min-w-[7rem]",
  },
  { key: "joined_date", label: "Joined", className: "w-[8%] min-w-[6.5rem]" },
  { key: "follow_up_date", label: "Follow-up", className: "w-[8%] min-w-[6.5rem]" },
  { key: "last_activity", label: "Last Activity", className: "w-[10%] min-w-[7.5rem]" },
];

function SortIndicator({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: AdminLeadHistorySort["dir"];
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
  columnKey: AdminLeadHistorySortKey;
  label: string;
  className: string;
  currentSort: AdminLeadHistorySort;
  onSort: (columnKey: AdminLeadHistorySortKey) => void;
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

export function SortableLeadHistoryTable({
  clubSlug,
  leads,
  searchQuery = "",
}: SortableLeadHistoryTableProps) {
  const [currentSort, setCurrentSort] = useState<AdminLeadHistorySort>(
    DEFAULT_ADMIN_LEAD_HISTORY_SORT,
  );
  const [sortReady, setSortReady] = useState(false);

  useEffect(() => {
    setCurrentSort(readAdminLeadHistorySortFromStorage(clubSlug));
    setSortReady(true);
  }, [clubSlug]);

  const visibleLeads = useMemo(
    () =>
      applyAdminLeadHistoryView({
        leads,
        sort: currentSort,
        query: searchQuery,
      }),
    [leads, currentSort, searchQuery],
  );

  const handleSort = (columnKey: AdminLeadHistorySortKey) => {
    setCurrentSort((previousSort) => {
      const nextSort: AdminLeadHistorySort = {
        key: columnKey,
        dir: getNextAdminLeadHistorySortDir(previousSort, columnKey),
      };

      writeAdminLeadHistorySortToStorage(clubSlug, nextSort);

      return nextSort;
    });
  };

  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
        No leads recorded yet.
      </p>
    );
  }

  const isSearchFiltered = Boolean(searchQuery.trim());

  return (
    <section aria-label="Lead history" className="space-y-3">
      <p className="text-sm text-dojo-muted">
        {isSearchFiltered
          ? `${visibleLeads.length} of ${leads.length} leads match your search.`
          : `${leads.length} leads in history.`}
        {sortReady ? " Click a column header to sort." : null}
      </p>

      {visibleLeads.length === 0 ? (
        <p className="rounded-xl border border-dojo-border bg-dojo-surface px-4 py-8 text-center text-sm text-dojo-muted">
          No leads match your search.
        </p>
      ) : (
        <div className="max-h-[min(70vh,48rem)] overflow-auto rounded-xl border border-dojo-border bg-dojo-surface">
          <table className="w-full min-w-[80rem] table-fixed text-left text-sm">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-dojo-border">
              {visibleLeads.map((lead) => {
                const trialDate = resolveLeadTrialBookedDate(lead);
                const followUpDate = resolveLeadFollowUpDisplayDate(lead);

                return (
                  <tr
                    key={lead.id}
                    className={`text-dojo-white ${lead.archivedAt ? "bg-dojo-elevated/30" : ""}`}
                  >
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
                      <div className="flex flex-col gap-1">
                        <LeadStatusLabel
                          statusLabel={lead.statusLabel}
                          showTrialAttendancePendingWarning={lead.trialAttendancePending}
                        />
                        {lead.archivedAt ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-dojo-muted">
                            Archived
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 truncate text-dojo-muted" title={lead.leadSourceLabel}>
                      {lead.leadSourceLabel}
                    </td>
                    <td className="px-3 py-3 truncate">
                      {formatLeadProgrammeInterestLabel(lead.programmeInterest)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {formatAdminLeadDate(lead.submittedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {trialDate ? formatAdminLeadDate(trialDate) : "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {lead.trialAttendedAt ? formatAdminLeadDate(lead.trialAttendedAt) : "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {lead.joinedAt ? formatAdminLeadDate(lead.joinedAt) : "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {followUpDate ? formatAdminLeadDate(followUpDate) : "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-dojo-muted">
                      {formatAdminLeadDateTime(lead.lastActivityAt)}
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
