"use client";

import {
  hideInstructorPortalMessageAction,
  markInstructorPortalMessageReadAction,
} from "@/app/instructor-portal/(portal)/[clubSlug]/messages/actions";
import { PortalMessagesInbox } from "@/components/portal/portal-messages-inbox";
import type { PortalMessageListItem } from "@/lib/portal-messages.shared";

interface InstructorPortalMessagesInboxProps {
  clubSlug: string;
  messages: PortalMessageListItem[];
}

export function InstructorPortalMessagesInbox({
  clubSlug,
  messages,
}: InstructorPortalMessagesInboxProps) {
  return (
    <PortalMessagesInbox
      messages={messages}
      onOpenMessage={(messageId) =>
        markInstructorPortalMessageReadAction(clubSlug, messageId)
      }
      onDeleteMessage={(messageId) =>
        hideInstructorPortalMessageAction(clubSlug, messageId)
      }
    />
  );
}
