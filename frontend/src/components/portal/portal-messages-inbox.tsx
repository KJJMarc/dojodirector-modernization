"use client";

import { useMemo, useState, useTransition } from "react";
import type { PortalMessageListItem } from "@/lib/portal-messages.shared";

interface PortalMessagesInboxProps {
  messages: PortalMessageListItem[];
  onOpenMessage: (messageId: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

export function PortalMessagesInbox({
  messages: initialMessages,
  onOpenMessage,
  onDeleteMessage,
}: PortalMessagesInboxProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialMessages[0]?.id ?? null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? null,
    [messages, selectedId],
  );

  function handleSelect(message: PortalMessageListItem) {
    setActionError(null);
    setSelectedId(message.id);

    if (!message.isUnread) {
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

  function handleDelete() {
    if (!selectedMessage) {
      return;
    }

    if (!window.confirm("Delete this message?")) {
      return;
    }

    setActionError(null);

    startTransition(async () => {
      try {
        await onDeleteMessage(selectedMessage.id);
        const remaining = messages.filter((row) => row.id !== selectedMessage.id);
        setMessages(remaining);
        setSelectedId(remaining[0]?.id ?? null);
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
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto rounded-xl border border-dojo-border bg-dojo-surface p-2">
          {messages.map((message) => {
            const isSelected = message.id === selectedId;

            return (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(message)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                    isSelected
                      ? "border-dojo-red/50 bg-dojo-elevated"
                      : "border-dojo-border bg-dojo-elevated/40 hover:border-dojo-red/30"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        message.isUnread ? "bg-dojo-red" : "bg-transparent"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold text-dojo-white">
                        {message.subject}
                      </span>
                      {message.bodyPreview ? (
                        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-dojo-muted">
                          {message.bodyPreview}
                        </span>
                      ) : null}
                      <span className="mt-1.5 block text-xs text-dojo-muted">
                        {message.sentAtListLabel}
                      </span>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <section className="min-h-[16rem] rounded-xl border border-dojo-border bg-dojo-surface p-4">
          {selectedMessage ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-dojo-white">
                  {selectedMessage.subject}
                </h3>
                <p className="mt-1 text-xs text-dojo-muted">
                  {selectedMessage.sentAtLabel}
                </p>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-dojo-white">
                {selectedMessage.body}
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-3 text-xs font-semibold text-dojo-white transition hover:border-dojo-red/50"
              >
                Delete message
              </button>
            </div>
          ) : (
            <p className="text-sm text-dojo-muted">Select a message to read.</p>
          )}
        </section>
      </div>

      {actionError ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
