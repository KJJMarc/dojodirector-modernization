import type { AcademyMessageRecipientType } from "@/lib/academy-messaging.shared";
import { WAITLIST_OFFER_SESSION_MARKER_PREFIX } from "@/lib/session-waitlist.shared";

export type PortalMessageRecipientType = "student" | "instructor";

export interface PortalMessageWaitlistOfferAction {
  sessionId: string;
  expiresAt: string | null;
  isOfferActive: boolean;
  isBookingConfirmed: boolean;
}

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
  waitlistOffer?: PortalMessageWaitlistOfferAction;
}

export type PortalMessageBodySegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const MESSAGE_PREVIEW_MAX_LENGTH = 75;

/**
 * Detect http(s) and www. URLs in portal message plain text for safe linkification.
 * Trailing sentence punctuation is not part of the URL.
 */
const PORTAL_MESSAGE_URL_PATTERN =
  /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi;

const TRAILING_URL_PUNCTUATION = /[),.!?;:]+$/;

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

/** Strip common trailing punctuation that is part of surrounding sentence, not the URL. */
export function trimPortalMessageUrlMatch(raw: string): {
  url: string;
  trailing: string;
} {
  const match = raw.match(TRAILING_URL_PUNCTUATION);

  if (!match) {
    return { url: raw, trailing: "" };
  }

  return {
    url: raw.slice(0, raw.length - match[0].length),
    trailing: match[0],
  };
}

/** Ensure www. links open as https absolute URLs. Reject empty/invalid after trim. */
export function normalizePortalMessageLinkHref(url: string): string | null {
  const trimmed = url.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return null;
}

/**
 * Split portal message body into plain-text and link segments.
 * Does not parse HTML — storage remains plain text; only display is linkified.
 */
export function splitPortalMessageBodyWithLinks(
  body: string,
): PortalMessageBodySegment[] {
  if (!body) {
    return [];
  }

  const segments: PortalMessageBodySegment[] = [];
  let lastIndex = 0;
  const pattern = new RegExp(
    PORTAL_MESSAGE_URL_PATTERN.source,
    PORTAL_MESSAGE_URL_PATTERN.flags,
  );

  for (const match of body.matchAll(pattern)) {
    const raw = match[0] ?? "";
    const start = match.index ?? 0;

    if (start > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, start) });
    }

    const { url, trailing } = trimPortalMessageUrlMatch(raw);
    const href = normalizePortalMessageLinkHref(url);

    if (href && url) {
      segments.push({ type: "link", value: url, href });
      if (trailing) {
        segments.push({ type: "text", value: trailing });
      }
    } else {
      segments.push({ type: "text", value: raw });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: body }];
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
    bodyPreview: formatPortalMessagePreview(
      row.body
        .split("\n")
        .filter((line) => !line.trim().startsWith(WAITLIST_OFFER_SESSION_MARKER_PREFIX))
        .join("\n"),
    ),
    sentAt: row.sent_at,
    sentAtLabel: formatPortalMessageSentLabel(row.sent_at),
    sentAtListLabel: formatPortalMessageListDate(row.sent_at),
    readAt: row.read_at,
    isUnread: !row.read_at,
  };
}
