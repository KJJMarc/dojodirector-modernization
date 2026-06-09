"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  loadEligiblePortalAccessMembersAction,
  sendPortalAccessEmailAction,
  sendSelectedPortalAccessEmailsAction,
} from "@/app/admin/[clubSlug]/messaging/portal-access/actions";
import { PortalAccessEligibleTable } from "@/components/admin/portal-access-eligible-table";
import {
  DEFAULT_PORTAL_ACCESS_ELIGIBLE_SORT,
  PORTAL_ACCESS_BULK_MODE_COPY,
  PORTAL_ACCESS_ELIGIBLE_PAGE_SIZE,
  PORTAL_ACCESS_SEND_CONFIRMATION_TEXT,
  filterPortalAccessEligibleMembers,
  paginatePortalAccessEligibleMembers,
  sortPortalAccessEligibleMembers,
  type PortalAccessBulkMode,
  type PortalAccessBulkSendSummary,
  type PortalAccessEligibleSort,
  type PortalAccessMemberSummary,
} from "@/lib/portal-access.shared";

interface PortalAccessEligibleReviewProps {
  clubSlug: string;
  mode: PortalAccessBulkMode | null;
  onOpenChange: (open: boolean) => void;
}

const inputClassName =
  "w-full min-w-0 rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

const modalPanelClassName =
  "flex max-h-[min(92vh,56rem)] w-full min-w-0 max-w-5xl flex-col overflow-hidden whitespace-normal rounded-xl border border-dojo-border bg-dojo-surface shadow-xl";

const closeButtonClassName =
  "inline-flex shrink-0 items-center justify-center rounded-md border border-dojo-border px-3 py-1.5 text-xs font-semibold text-dojo-muted transition hover:text-dojo-white";

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
  mode,
  onOpenChange,
}: PortalAccessEligibleReviewProps) {
  const open = mode !== null;
  const modeCopy = mode ? PORTAL_ACCESS_BULK_MODE_COPY[mode] : null;
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

  const listNoun = modeCopy?.listNoun ?? "eligible";
  const listCountLabel =
    filterQuery.trim() && filteredMembers.length !== eligibleMembers.length
      ? `${filteredMembers.length} of ${eligibleMembers.length} ${listNoun}`
      : `${eligibleMembers.length} ${listNoun}`;

  const closeReview = useCallback(() => {
    if (!isSendPending && !isInvitePending) {
      onOpenChange(false);
    }
  }, [isInvitePending, isSendPending, onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeReview();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeReview, open]);

  useEffect(() => {
    if (!open || !mode) {
      return;
    }

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
        const response = await loadEligiblePortalAccessMembersAction(clubSlug, mode);
        setEligibleMembers(response.members);
        setSelectedIds(new Set());
      } catch (error) {
        setEligibleMembers([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : (modeCopy?.loadErrorMessage ?? "Unable to load eligible students."),
        );
      }
    });
  }, [clubSlug, mode, open, modeCopy?.loadErrorMessage]);

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

  async function refreshEligibleMembers() {
    if (!mode) {
      return;
    }

    const refreshed = await loadEligiblePortalAccessMembersAction(clubSlug, mode);
    setEligibleMembers(refreshed.members);
    router.refresh();
  }

  function handleInviteMember(userId: string) {
    setRowInviteMessage(null);
    setRowInviteError(null);
    setInvitingUserId(userId);

    startInviteTransition(async () => {
      const result = await sendPortalAccessEmailAction(clubSlug, userId);

      if (!result.ok) {
        setRowInviteError(result.error);
        setInvitingUserId(null);
        return;
      }

      setRowInviteMessage(result.message);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });

      try {
        await refreshEligibleMembers();
      } catch (error) {
        setRowInviteError(
          error instanceof Error
            ? error.message
            : "Invite sent, but the list could not be refreshed.",
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

    if (confirmation.trim() !== PORTAL_ACCESS_SEND_CONFIRMATION_TEXT) {
      setSendError(
        `Type ${PORTAL_ACCESS_SEND_CONFIRMATION_TEXT} to confirm sending portal access emails.`,
      );
      return;
    }

    if (!mode) {
      setSendError("Unable to send portal access emails.");
      return;
    }

    startSendTransition(async () => {
      const result = await sendSelectedPortalAccessEmailsAction(
        clubSlug,
        Array.from(selectedIds),
        confirmation,
        mode,
      );

      if (!result.ok) {
        setSendError(result.error);
        return;
      }

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

      try {
        await refreshEligibleMembers();
      } catch (error) {
        setSendError(
          error instanceof Error
            ? error.message
            : "Invites sent, but the list could not be refreshed.",
        );
      }
    });
  }

  if (!open || !mode || !modeCopy || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-access-bulk-review-title"
      onClick={closeReview}
    >
      <div className={modalPanelClassName} onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-dojo-border px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2
              id="portal-access-bulk-review-title"
              className="break-words text-lg font-semibold text-dojo-white [overflow-wrap:anywhere]"
            >
              {modeCopy.title}
            </h2>
            <p className="mt-1 break-words text-sm leading-relaxed text-dojo-muted [overflow-wrap:anywhere]">
              {modeCopy.helper}
            </p>
          </div>
          <button
            type="button"
            onClick={closeReview}
            disabled={isSendPending || isInvitePending}
            className={closeButtonClassName}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {isLoadPending ? (
            <p className="text-sm text-dojo-muted">{modeCopy.loadingMessage}</p>
          ) : null}

          {loadError ? (
            <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
              {loadError}
            </p>
          ) : null}

          {!isLoadPending && !loadError && eligibleMembers.length === 0 ? (
            <p className="text-sm text-dojo-muted">
              {modeCopy.emptyMessage}
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
                  disabled={
                    selectedCount === 0 ||
                    isSendPending ||
                    confirmation.trim() !== PORTAL_ACCESS_SEND_CONFIRMATION_TEXT
                  }
                  className="inline-flex min-h-[40px] w-full items-center justify-center rounded-md bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

              <div className="min-w-0 overflow-x-auto">
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
              </div>

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
      </div>
    </div>,
    document.body,
  );
}
