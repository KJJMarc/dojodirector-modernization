export const SESSION_WAITLIST_STATUSES = [
  "waiting",
  "offered",
  "booked",
  "expired",
  "cancelled",
] as const;

export type SessionWaitlistStatus = (typeof SESSION_WAITLIST_STATUSES)[number];

export const WAITLIST_OFFER_DURATION_MS = 30 * 60 * 1000;

export const WAITLIST_OFFER_MESSAGE_SUBJECT = "Waitlist Offer";

export const WAITLIST_ACCEPT_SUCCESS_MESSAGE =
  "Booking accepted. Your place has been confirmed.";

export const WAITLIST_OFFER_UNAVAILABLE_MESSAGE =
  "This waitlist offer is no longer available.";

/** Machine-readable session id appended to waitlist offer portal messages. */
export const WAITLIST_OFFER_SESSION_MARKER_PREFIX = "session:";

export interface SessionWaitlistBookingAvailabilityInput {
  capacity: number | null;
  bookedCount: number;
  hasActiveWaitlistOffer: boolean;
  waitingQueueCount: number;
}

/** Spaces the public can still book (active offers and waiting queue reserve open spots). */
export function getEffectiveSpacesAvailable(
  input: SessionWaitlistBookingAvailabilityInput,
): number | null {
  if (input.capacity === null) {
    return null;
  }

  const physicalSpots = Math.max(0, input.capacity - input.bookedCount);
  const reservedForOffer = input.hasActiveWaitlistOffer ? 1 : 0;

  if (input.waitingQueueCount > 0 && physicalSpots > reservedForOffer) {
    return 0;
  }

  return Math.max(0, physicalSpots - reservedForOffer);
}

export function isSessionPubliclyBookable(
  input: SessionWaitlistBookingAvailabilityInput,
) {
  const spaces = getEffectiveSpacesAvailable(input);
  return spaces === null || spaces > 0;
}

export function buildWaitlistOfferSessionMarker(sessionId: string) {
  return `${WAITLIST_OFFER_SESSION_MARKER_PREFIX}${sessionId.trim()}`;
}

export function parseWaitlistOfferSessionIdFromBody(body: string) {
  const lines = body.split("\n");

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]?.trim();

    if (!line?.startsWith(WAITLIST_OFFER_SESSION_MARKER_PREFIX)) {
      continue;
    }

    const sessionId = line.slice(WAITLIST_OFFER_SESSION_MARKER_PREFIX.length).trim();
    return sessionId || null;
  }

  return null;
}

export function stripWaitlistOfferMarkerFromBody(body: string) {
  return body
    .split("\n")
    .filter((line) => !line.trim().startsWith(WAITLIST_OFFER_SESSION_MARKER_PREFIX))
    .join("\n")
    .trimEnd();
}

export function buildWaitlistOfferMessageBody(input: {
  className: string;
  dateLabel: string;
  timeLabel: string;
  sessionId: string;
}) {
  return [
    "A space has become available for:",
    "",
    input.className,
    input.dateLabel,
    input.timeLabel,
    "",
    "You have 30 minutes to accept this place.",
    "",
    "Use Accept Booking or Decline Place below, or open Book a Class in your portal.",
    "",
    buildWaitlistOfferSessionMarker(input.sessionId),
  ].join("\n");
}

export function formatWaitlistOfferCountdown(expiresAtIso: string, nowMs = Date.now()) {
  const expiresMs = new Date(expiresAtIso).getTime();

  if (Number.isNaN(expiresMs)) {
    return null;
  }

  const remainingMs = expiresMs - nowMs;

  if (remainingMs <= 0) {
    return "Offer expired";
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
  }

  return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"} left`;
}
