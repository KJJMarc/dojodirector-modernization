"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { PortalMessageBody } from "@/components/portal/portal-message-body";
import type { PortalMessageListItem } from "@/lib/portal-messages.shared";

interface PortalMessagesInboxProps {
  messages: PortalMessageListItem[];
  onOpenMessage: (messageId: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  renderMessageActions?: (message: PortalMessageListItem) => ReactNode;
}

export function PortalMessagesInbox({
  messages: initialMessages,
  onOpenMessage,
  onDeleteMessage,
  renderMessageActions,
}: PortalMessagesInboxProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(message: PortalMessageListItem) {
    setActionError(null);
    const willExpand = expandedId !== message.id;
    setExpandedId(willExpand ? message.id : null);

    if (!willExpand || !message.isUnread) {
      return;
    }

    startTransition(async () => {
      try {
        await onOpenMessage(message.id);
        setMessages((current) =>
          current.map((row) =>
            row.id === message.id
              ? { ...row, isUnread: false, readAt: new Date().toISOString() }
              : row,
          ),
        );
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Unable to mark message as read.",
        );
      }
    });
  }

  function handleDelete(messageId: string) {
    if (!window.confirm("Delete this message?")) {
      return;
    }

    setActionError(null);

    startTransition(async () => {
      try {
        await onDeleteMessage(messageId);
        const remaining = messages.filter((row) => row.id !== messageId);
        setMessages(remaining);
        setExpandedId((current) => (current === messageId ? null : current));
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Unable to delete message.",
        );
      }
    });
  }

  if (messages.length === 0) {
    return (
      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center">
        <p className="text-sm text-dojo-muted">No messages yet.</p>
      </section>
    );
  }

  return (
    <div className={`space-y-3 ${isPending ? "pointer-events-none opacity-70" : ""}`}>
      <ul className="space-y-2">
        {messages.map((message) => {
          const isExpanded = expandedId === message.id;

          return (
            <li
              key={message.id}
              className={`overflow-hidden rounded-xl border bg-dojo-surface transition ${
                isExpanded
                  ? "border-dojo-red/50"
                  : "border-dojo-border hover:border-dojo-red/30"
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(message)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
              >
                <span
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                    message.isUnread ? "bg-dojo-red" : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-dojo-white">
                      {message.subject}
                    </span>
                    <span className="shrink-0 text-xs text-dojo-muted">
                      {message.sentAtListLabel}
                    </span>
                  </span>
                  {message.bodyPreview && !isExpanded ? (
                    <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-dojo-muted">
                      {message.bodyPreview}
                    </span>
                  ) : null}
                </span>
              </button>

              {isExpanded ? (
                <div className="space-y-4 border-t border-dojo-border px-4 py-4">
                  <p className="text-xs text-dojo-muted">{message.sentAtLabel}</p>
                  <PortalMessageBody body={message.body} />
                  {renderMessageActions ? renderMessageActions(message) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(message.id)}
                    className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50"
                  >
                    Delete message
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {actionError ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
