"use client";

import { useState } from "react";
import {
  hideStudentPortalMessageAction,
  markStudentPortalMessageReadAction,
} from "@/app/student-portal/[clubSlug]/[userId]/messages/actions";
import { PortalMessagesInbox } from "@/components/portal/portal-messages-inbox";
import { StudentPortalWaitlistOfferMessageActions } from "@/components/student-portal/student-portal-waitlist-offer-message-actions";
import type { PortalMessageListItem } from "@/lib/portal-messages.shared";

interface StudentPortalMessagesInboxProps {
  clubSlug: string;
  userId: string;
  messages: PortalMessageListItem[];
}

export function StudentPortalMessagesInbox({
  clubSlug,
  userId,
  messages,
}: StudentPortalMessagesInboxProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {actionSuccess ? (
        <section className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-dojo-white">
          {actionSuccess}
        </section>
      ) : null}
      {actionError ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {actionError}
        </p>
      ) : null}
      <PortalMessagesInbox
        messages={messages}
        onOpenMessage={(messageId) =>
          markStudentPortalMessageReadAction(clubSlug, userId, messageId)
        }
        onDeleteMessage={(messageId) =>
          hideStudentPortalMessageAction(clubSlug, userId, messageId)
        }
        renderMessageActions={(message) => (
          <StudentPortalWaitlistOfferMessageActions
            clubSlug={clubSlug}
            userId={userId}
            message={message}
            onActionError={setActionError}
            onActionSuccess={setActionSuccess}
          />
        )}
      />
    </div>
  );
}
