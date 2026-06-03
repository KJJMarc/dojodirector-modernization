import type { AcademyMessageRecipientType } from "@/lib/academy-messaging.shared";

export type PortalMessageRecipientType = "student" | "instructor";

export interface PortalMessageListItem {
  id: string;
  subject: string;
  body: string;
  bodyPreview: string;
  sentAt: string;
  sentAtLabel: string;
  sentAtListLabel: string;
  readAt: string | null;
  isUnread: boolean;
}

const MESSAGE_PREVIEW_MAX_LENGTH = 75;

export function formatPortalMessagePreview(body: string, maxLength = MESSAGE_PREVIEW_MAX_LENGTH) {
  const normalized = body.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

export function formatPortalMessageListDate(sentAtIso: string) {
  const parsed = new Date(sentAtIso);

  if (Number.isNaN(parsed.getTime())) {
    return sentAtIso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function toPortalMessageRecipientType(
  recipientType: AcademyMessageRecipientType,
): PortalMessageRecipientType {
  return recipientType === "students" ? "student" : "instructor";
}

export function formatPortalMessagesNavLabel(unreadCount: number) {
  if (unreadCount <= 0) {
    return "Messages";
  }

  return `Messages (${unreadCount})`;
}

export function formatPortalMessageSentLabel(sentAtIso: string) {
  const parsed = new Date(sentAtIso);

  if (Number.isNaN(parsed.getTime())) {
    return sentAtIso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function mapPortalMessageRow(row: {
  id: string;
  subject: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}): PortalMessageListItem {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    bodyPreview: formatPortalMessagePreview(row.body),
    sentAt: row.sent_at,
    sentAtLabel: formatPortalMessageSentLabel(row.sent_at),
    sentAtListLabel: formatPortalMessageListDate(row.sent_at),
    readAt: row.read_at,
    isUnread: !row.read_at,
  };
}
