"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loadAcademyMessageRecipientsAction,
  sendAcademyMessageToSelectedAction,
} from "@/app/admin/[clubSlug]/messaging/academy-messaging/actions";
import { AcademyMessageRecipientsTable } from "@/components/admin/academy-message-recipients-table";
import {
  ACADEMY_MESSAGE_PAGE_SIZE,
  filterAcademyMessageRecipients,
  paginateAcademyMessageRecipients,
  sortAcademyMessageRecipients,
  type AcademyMessageRecipient,
  type AcademyMessageRecipientType,
  type AcademyMessageSendSummary,
} from "@/lib/academy-messaging.shared";

interface AcademyMessagingToolProps {
  clubSlug: string;
  recipientType: AcademyMessageRecipientType;
  title: string;
  description: string;
}

interface SendSuccessState {
  subject: string;
  recipientCount: number;
  sentAtLabel: string;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-[11px] font-medium uppercase tracking-wide text-dojo-muted";

function formatAdminSendTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SendSuccessBanner({ success }: { success: SendSuccessState }) {
  return (
    <div className="space-y-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-dojo-white">
      <p className="font-semibold text-emerald-200">✓ Message sent successfully</p>
      <dl className="space-y-1 text-dojo-muted">
        <div>
          <dt className="inline font-medium text-dojo-white">Subject: </dt>
          <dd className="inline">{success.subject}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-dojo-white">Recipients: </dt>
          <dd className="inline">{success.recipientCount}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-dojo-white">Sent: </dt>
          <dd className="inline">{success.sentAtLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

function SendIssuesBanner({ summary }: { summary: AcademyMessageSendSummary }) {
  if (summary.skippedCount === 0 && summary.failedCount === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-3 py-3 text-sm text-dojo-white">
      {summary.skippedCount > 0 ? (
        <p>
          Skipped: <span className="font-semibold">{summary.skippedCount}</span>
        </p>
      ) : null}
      {summary.skippedRecipients.length > 0 ? (
        <ul className="space-y-1 text-xs text-dojo-muted">
          {summary.skippedRecipients.map((skipped) => (
            <li key={`${skipped.userId}-${skipped.reason}`}>
              {skipped.fullName}: {skipped.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {summary.failedCount > 0 ? (
        <p>
          Failed: <span className="font-semibold">{summary.failedCount}</span>
        </p>
      ) : null}
      {summary.failures.length > 0 ? (
        <ul className="space-y-1 text-xs text-dojo-muted">
          {summary.failures.map((failure) => (
            <li key={`${failure.fullName}-${failure.reason}`}>
              {failure.fullName}: {failure.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AcademyMessagingTool({
  clubSlug,
  recipientType,
  title,
  description,
}: AcademyMessagingToolProps) {
  const [recipients, setRecipients] = useState<AcademyMessageRecipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [filterQuery, setFilterQuery] = useState("");
  const [page, setPage] = useState(1);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<SendSuccessState | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendIssues, setSendIssues] = useState<AcademyMessageSendSummary | null>(null);
  const router = useRouter();
  const [isLoadPending, startLoadTransition] = useTransition();
  const [isSendPending, startSendTransition] = useTransition();

  useEffect(() => {
    startLoadTransition(async () => {
      try {
        const response = await loadAcademyMessageRecipientsAction(
          clubSlug,
          recipientType,
        );
        setRecipients(response.recipients);
        setSelectedIds(new Set());
        setLoadError(null);
      } catch (error) {
        setRecipients([]);
        setLoadError(
          error instanceof Error ? error.message : "Unable to load recipients.",
        );
      }
    });
  }, [clubSlug, recipientType]);

  const filteredRecipients = useMemo(
    () => filterAcademyMessageRecipients(recipients, filterQuery),
    [recipients, filterQuery],
  );

  const sortedRecipients = useMemo(
    () => sortAcademyMessageRecipients(filteredRecipients),
    [filteredRecipients],
  );

  const { pageRecipients, totalPages, safePage } = useMemo(
    () => paginateAcademyMessageRecipients(sortedRecipients, page, ACADEMY_MESSAGE_PAGE_SIZE),
    [sortedRecipients, page],
  );

  useEffect(() => {
    setPage(1);
  }, [filterQuery]);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const selectedCount = selectedIds.size;
  const visibleIds = useMemo(
    () => filteredRecipients.map((recipient) => recipient.userId),
    [filteredRecipients],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((userId) => selectedIds.has(userId));

  const listCountLabel =
    filterQuery.trim() && filteredRecipients.length !== recipients.length
      ? `${filteredRecipients.length} of ${recipients.length} eligible`
      : `${recipients.length} eligible`;

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

  function handleSendSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendError(null);
    setSendIssues(null);

    if (selectedCount === 0) {
      setSendError("Select at least one recipient.");
      return;
    }

    const confirmMessage = `Send message to ${selectedCount} selected recipient${
      selectedCount === 1 ? "" : "s"
    }?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSendSuccess(null);

    startSendTransition(async () => {
      try {
        const result = await sendAcademyMessageToSelectedAction({
          clubSlug,
          recipientType,
          userIds: Array.from(selectedIds),
          subject,
          body,
        });

        if (result.createdCount === 0) {
          setSendError("No portal messages were created. Check skipped or failed recipients below.");
          setSendIssues(result);
          return;
        }

        setSendSuccess({
          subject: subject.trim(),
          recipientCount: result.createdCount,
          sentAtLabel: formatAdminSendTimestamp(new Date()),
        });

        if (result.skippedCount > 0 || result.failedCount > 0) {
          setSendIssues(result);
        } else {
          setSendIssues(null);
        }

        setSelectedIds(new Set());

        const refreshed = await loadAcademyMessageRecipientsAction(
          clubSlug,
          recipientType,
        );
        setRecipients(refreshed.recipients);
        router.refresh();
      } catch (error) {
        setSendError(
          error instanceof Error ? error.message : "Unable to create portal messages.",
        );
      }
    });
  }

  const recipientLabelPlural = recipientType === "students" ? "students" : "instructors";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-dojo-white">{title}</h2>
        <p className="mt-1 text-sm text-dojo-muted">{description}</p>
      </div>

      {isLoadPending ? (
        <p className="text-sm text-dojo-muted">Loading {recipientLabelPlural}…</p>
      ) : null}

      {loadError ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {loadError}
        </p>
      ) : null}

      {!isLoadPending && !loadError && recipients.length === 0 ? (
        <p className="text-sm text-dojo-muted">
          No active {recipientLabelPlural} at this academy.
        </p>
      ) : null}

      {!isLoadPending && recipients.length > 0 ? (
        <>
          <form
            className="space-y-3 rounded-xl border border-dojo-border bg-dojo-elevated/40 p-4"
            onSubmit={handleSendSelected}
          >
            <h3 className="text-sm font-semibold text-dojo-white">Compose message</h3>

            <div className="space-y-1.5">
              <label htmlFor="academy-message-subject" className={labelClassName}>
                Subject
              </label>
              <input
                id="academy-message-subject"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className={inputClassName}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="academy-message-body" className={labelClassName}>
                Message body
              </label>
              <textarea
                id="academy-message-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={6}
                className={`${inputClassName} min-h-[8rem] resize-y`}
              />
            </div>

            <button
              type="submit"
              disabled={selectedCount === 0 || isSendPending}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSendPending
                ? "Sending…"
                : `Send message to selected ${recipientLabelPlural}`}
            </button>
          </form>

          {sendSuccess ? <SendSuccessBanner success={sendSuccess} /> : null}

          {sendError ? (
            <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
              {sendError}
            </p>
          ) : null}

          {sendIssues ? <SendIssuesBanner summary={sendIssues} /> : null}

          <div className="space-y-1.5">
            <label htmlFor="academy-message-filter" className={labelClassName}>
              Search recipients
            </label>
            <input
              id="academy-message-filter"
              type="search"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Search name or email"
              className={inputClassName}
            />
          </div>

          <p className="text-sm font-semibold text-dojo-white">
            {selectedCount} selected
            <span className="font-normal text-dojo-muted"> · {listCountLabel}</span>
          </p>

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

          <AcademyMessageRecipientsTable
            recipients={pageRecipients}
            selectedIds={selectedIds}
            onToggleMember={toggleMember}
          />

          {sortedRecipients.length > ACADEMY_MESSAGE_PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-dojo-muted">
              <p>
                Page {safePage} of {totalPages}
                <span className="text-dojo-white">
                  {" "}
                  · Showing {(safePage - 1) * ACADEMY_MESSAGE_PAGE_SIZE + 1}–
                  {Math.min(safePage * ACADEMY_MESSAGE_PAGE_SIZE, sortedRecipients.length)}{" "}
                  of {sortedRecipients.length}
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
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
