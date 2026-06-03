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

export function buildWaitlistOfferMessageBody(input: {
  className: string;
  dateLabel: string;
  timeLabel: string;
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
    "Open Book a Class in your portal and tap Accept Booking.",
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
