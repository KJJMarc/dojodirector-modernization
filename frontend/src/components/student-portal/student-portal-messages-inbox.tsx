"use client";

import {
  hideStudentPortalMessageAction,
  markStudentPortalMessageReadAction,
} from "@/app/student-portal/[clubSlug]/[userId]/messages/actions";
import { PortalMessagesInbox } from "@/components/portal/portal-messages-inbox";
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
  return (
    <PortalMessagesInbox
      messages={messages}
      onOpenMessage={(messageId) =>
        markStudentPortalMessageReadAction(clubSlug, userId, messageId)
      }
      onDeleteMessage={(messageId) =>
        hideStudentPortalMessageAction(clubSlug, userId, messageId)
      }
    />
  );
}
