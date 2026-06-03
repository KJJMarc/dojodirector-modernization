export interface GuestBookingEmailContent {
  guestName: string;
  guestEmail: string;
  className: string;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
  academyName: string;
  createdAtLabel: string;
}

export function guestBookingConfirmationSubject(className: string) {
  return `Booking confirmed - ${className.trim() || "Class"}`;
}

export function guestBookingAcademyNotificationSubject(className: string) {
  return `New guest booking - ${className.trim() || "Class"}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatLocation(location: string | null) {
  const trimmed = location?.trim();

  return trimmed || "To be confirmed";
}

export function buildGuestBookingConfirmationHtml(content: GuestBookingEmailContent) {
  const location = formatLocation(content.location);

  return `
    <p>Hi ${escapeHtml(content.guestName)},</p>
    <p>Your class booking at <strong>${escapeHtml(content.academyName)}</strong> is confirmed.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Class</td><td><strong>${escapeHtml(content.className)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td>${escapeHtml(content.dateLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Time</td><td>${escapeHtml(content.timeLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Location</td><td>${escapeHtml(location)}</td></tr>
    </table>
    <p>If you need to change or cancel this booking, please reply to this email.</p>
    <p style="color:#666;font-size:12px;">Sent by Dojo Director on behalf of ${escapeHtml(content.academyName)}.</p>
  `.trim();
}

export function buildGuestBookingConfirmationText(content: GuestBookingEmailContent) {
  const location = formatLocation(content.location);

  return [
    `Hi ${content.guestName},`,
    "",
    `Your class booking at ${content.academyName} is confirmed.`,
    "",
    `Class: ${content.className}`,
    `Date: ${content.dateLabel}`,
    `Time: ${content.timeLabel}`,
    `Location: ${location}`,
    "",
    "If you need to change or cancel this booking, please reply to this email.",
  ].join("\n");
}

export function buildGuestBookingAcademyNotificationHtml(content: GuestBookingEmailContent) {
  const location = formatLocation(content.location);

  return `
    <p>A new guest booking was received for <strong>${escapeHtml(content.academyName)}</strong>.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Guest</td><td>${escapeHtml(content.guestName)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td>${escapeHtml(content.guestEmail)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Class</td><td><strong>${escapeHtml(content.className)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td>${escapeHtml(content.dateLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Time</td><td>${escapeHtml(content.timeLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Location</td><td>${escapeHtml(location)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Booked at</td><td>${escapeHtml(content.createdAtLabel)}</td></tr>
    </table>
  `.trim();
}

export function buildGuestBookingAcademyNotificationText(content: GuestBookingEmailContent) {
  const location = formatLocation(content.location);

  return [
    `New guest booking for ${content.academyName}`,
    "",
    `Guest: ${content.guestName}`,
    `Email: ${content.guestEmail}`,
    `Class: ${content.className}`,
    `Date: ${content.dateLabel}`,
    `Time: ${content.timeLabel}`,
    `Location: ${location}`,
    `Booked at: ${content.createdAtLabel}`,
  ].join("\n");
}
