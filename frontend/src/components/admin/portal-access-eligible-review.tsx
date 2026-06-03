"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loadEligiblePortalAccessMembersAction,
  sendPortalAccessEmailAction,
  sendSelectedPortalAccessEmailsAction,
} from "@/app/admin/[clubSlug]/messaging/portal-access/actions";
import { PortalAccessEligibleTable } from "@/components/admin/portal-access-eligible-table";
import {
  DEFAULT_PORTAL_ACCESS_ELIGIBLE_SORT,
  PORTAL_ACCESS_ELIGIBLE_PAGE_SIZE,
  PORTAL_ACCESS_SEND_CONFIRMATION_TEXT,
  filterPortalAccessEligibleMembers,
  paginatePortalAccessEligibleMembers,
  sortPortalAccessEligibleMembers,
  type PortalAccessBulkSendSummary,
  type PortalAccessEligibleSort,
  type PortalAccessMemberSummary,
} from "@/lib/portal-access.shared";

interface PortalAccessEligibleReviewProps {
  clubSlug: string;
  eligibleCount: number;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

const actionCardClassName =
  "flex w-full min-h-[88px] flex-col justify-center rounded-xl border border-dojo-border bg-dojo-elevated px-4 py-4 text-left transition hover:border-dojo-red/50 hover:bg-dojo-surface active:scale-[0.99]";

function SummaryBanner({ summary }: { summary: PortalAccessBulkSendSummary }) {
  return (
    <div className="space-y-2 rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-3 text-sm text-dojo-white">
      <p>
        Sent: <span className="font-semibold">{summary.sentCount}</span> · Skipped:{" "}
        <span className="font-semibold">{summary.skippedCount}</span> · Failed:{" "}
        <span className="font-semibold">{summary.failedCount}</span>
      </p>
      {summary.failures.length > 0 ? (
        <ul className="space-y-1 text-xs text-dojo-muted">
          {summary.failures.map((failure) => (
            <li key={`${failure.email ?? failure.fullName}-${failure.reason}`}>
              {failure.fullName}
              {failure.email ? ` (${failure.email})` : ""}: {failure.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PortalAccessEligibleReview({
  clubSlug,
  eligibleCount,
}: PortalAccessEligibleReviewProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [eligibleMembers, setEligibleMembers] = useState<PortalAccessMemberSummary[]>(
    [],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [filterQuery, setFilterQuery] = useState("");
  const [sort, setSort] = useState<PortalAccessEligibleSort>(
    DEFAULT_PORTAL_ACCESS_ELIGIBLE_SORT,
  );
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [rowInviteMessage, setRowInviteMessage] = useState<string | null>(null);
  const [rowInviteError, setRowInviteError] = useState<string | null>(null);
  const [sendSummary, setSendSummary] = useState<PortalAccessBulkSendSummary | null>(
    null,
  );
  const [confirmation, setConfirmation] = useState("");
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const router = useRouter();
  const [isLoadPending, startLoadTransition] = useTransition();
  const [isSendPending, startSendTransition] = useTransition();
  const [isInvitePending, startInviteTransition] = useTransition();

  const filteredMembers = useMemo(
    () => filterPortalAccessEligibleMembers(eligibleMembers, filterQuery),
    [eligibleMembers, filterQuery],
  );

  const sortedMembers = useMemo(
    () => sortPortalAccessEligibleMembers(filteredMembers, sort),
    [filteredMembers, sort],
  );

  const { pageMembers, totalPages, safePage } = useMemo(
    () =>
      paginatePortalAccessEligibleMembers(
        sortedMembers,
        page,
        PORTAL_ACCESS_ELIGIBLE_PAGE_SIZE,
      ),
    [sortedMembers, page],
  );

  useEffect(() => {
    setPage(1);
  }, [filterQuery, sort.key, sort.dir]);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const selectedCount = selectedIds.size;
  const visibleIds = useMemo(
    () => filteredMembers.map((member) => member.userId),
    [filteredMembers],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((userId) => selectedIds.has(userId));

  const listCountLabel =
    filterQuery.trim() && filteredMembers.length !== eligibleMembers.length
      ? `${filteredMembers.length} of ${eligibleMembers.length} eligible`
      : `${eligibleMembers.length} eligible`;

  function toggleMember(userId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }

      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const userId of visibleIds) {
        next.add(userId);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openReview() {
    setReviewOpen(true);
    setLoadError(null);
    setSendMessage(null);
    setSendError(null);
    setRowInviteMessage(null);
    setRowInviteError(null);
    setSendSummary(null);
    setFilterQuery("");
    setPage(1);

    startLoadTransition(async () => {
      try {
        const response = await loadEligiblePortalAccessMembersAction(clubSlug);
        setEligibleMembers(response.members);
        setSelectedIds(new Set());
      } catch (error) {
        setEligibleMembers([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load eligible students.",
        );
      }
    });
  }

  async function refreshEligibleMembers() {
    const refreshed = await loadEligiblePortalAccessMembersAction(clubSlug);
    setEligibleMembers(refreshed.members);
    router.refresh();
  }

  function handleInviteMember(userId: string) {
    setRowInviteMessage(null);
    setRowInviteError(null);
    setInvitingUserId(userId);

    startInviteTransition(async () => {
      try {
        const result = await sendPortalAccessEmailAction(clubSlug, userId);
        setRowInviteMessage(result.message);
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(userId);
          return next;
        });
        await refreshEligibleMembers();
      } catch (error) {
        setRowInviteError(
          error instanceof Error
            ? error.message
            : "Unable to send portal access email.",
        );
      } finally {
        setInvitingUserId(null);
      }
    });
  }

  function handleSendSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendMessage(null);
    setSendError(null);
    setSendSummary(null);

    if (selectedCount === 0) {
      setSendError("Select at least one student to invite.");
      return;
    }

    startSendTransition(async () => {
      try {
        const result = await sendSelectedPortalAccessEmailsAction(
          clubSlug,
          Array.from(selectedIds),
          confirmation,
        );
        setSendSummary({
          sentCount: result.sentCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
          failures: result.failures,
        });
        setSendMessage(
          `Finished sending to ${result.selectedCount} selected student${
            result.selectedCount === 1 ? "" : "s"
          }.`,
        );
        setConfirmation("");
        setSelectedIds(new Set());
        await refreshEligibleMembers();
      } catch (error) {
        setSendError(
          error instanceof Error
            ? error.message
            : "Unable to send portal access emails.",
        );
      }
    });
  }

  return (
    <section className="space-y-3">
      {!reviewOpen ? (
        <button type="button" onClick={openReview} className={actionCardClassName}>
          <span className="text-base font-semibold text-dojo-white">
            Review uninvited students
          </span>
          <span className="mt-1 text-xs leading-relaxed text-dojo-muted">
            View eligible students without portal access, select who to invite, and send
            portal setup emails in controlled batches.
            {eligibleCount > 0
              ? ` (${eligibleCount} eligible)`
              : " (none eligible right now)"}
          </span>
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-dojo-white">
                Review uninvited students
              </h2>
              <p className="mt-1 text-sm text-dojo-muted">
                {eligibleCount} eligible student{eligibleCount === 1 ? "" : "s"} at this
                academy. Select who should receive a portal setup email.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReviewOpen(false)}
              className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
            >
              Close
            </button>
          </div>

          {isLoadPending ? (
            <p className="text-sm text-dojo-muted">Loading eligible students…</p>
          ) : null}

          {loadError ? (
            <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
              {loadError}
            </p>
          ) : null}

          {!isLoadPending && !loadError && eligibleMembers.length === 0 ? (
            <p className="text-sm text-dojo-muted">
              No eligible students need a portal setup email right now.
            </p>
          ) : null}

          {!isLoadPending && eligibleMembers.length > 0 ? (
            <>
              <div className="space-y-1.5">
                <label htmlFor="portal-access-eligible-filter" className={labelClassName}>
                  Filter list
                </label>
                <input
                  id="portal-access-eligible-filter"
                  type="search"
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.target.value)}
                  placeholder="Search name, email, or role"
                  className={inputClassName}
                />
              </div>

              <p className="text-sm font-semibold text-dojo-white">
                {selectedCount} selected
                <span className="font-normal text-dojo-muted"> · {listCountLabel}</span>
              </p>

              <form className="space-y-3" onSubmit={handleSendSelected}>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    disabled={allVisibleSelected || visibleIds.length === 0}
                    className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Select all visible
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedCount === 0}
                    className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="portal-access-selected-confirm" className={labelClassName}>
                    Confirmation
                  </label>
                  <input
                    id="portal-access-selected-confirm"
                    type="text"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder={`Type ${PORTAL_ACCESS_SEND_CONFIRMATION_TEXT} to confirm`}
                    className={inputClassName}
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  disabled={selectedCount === 0 || isSendPending}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendPending
                    ? "Sending…"
                    : "Send selected portal invites"}
                </button>
              </form>

              {rowInviteMessage ? (
                <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white">
                  {rowInviteMessage}
                </p>
              ) : null}

              {rowInviteError ? (
                <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
                  {rowInviteError}
                </p>
              ) : null}

              <PortalAccessEligibleTable
                members={pageMembers}
                selectedIds={selectedIds}
                sort={sort}
                onSortChange={setSort}
                onToggleMember={toggleMember}
                onInviteMember={handleInviteMember}
                invitingUserId={invitingUserId}
                isInvitePending={isInvitePending}
              />

              {sortedMembers.length > PORTAL_ACCESS_ELIGIBLE_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-dojo-muted">
                  <p>
                    Page {safePage} of {totalPages}
                    <span className="text-dojo-white">
                      {" "}
                      · Showing {(safePage - 1) * PORTAL_ACCESS_ELIGIBLE_PAGE_SIZE + 1}–
                      {Math.min(
                        safePage * PORTAL_ACCESS_ELIGIBLE_PAGE_SIZE,
                        sortedMembers.length,
                      )}{" "}
                      of {sortedMembers.length}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}

              {sendMessage ? (
                <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white">
                  {sendMessage}
                </p>
              ) : null}

              {sendError ? (
                <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
                  {sendError}
                </p>
              ) : null}

              {sendSummary ? <SummaryBanner summary={sendSummary} /> : null}
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
