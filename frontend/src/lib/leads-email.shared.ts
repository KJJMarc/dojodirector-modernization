export interface LeadEmailContent {
  leadName: string;
  leadEmail: string;
  leadPhone: string | null;
  programmeInterestLabel: string;
  experienceLevelLabel: string;
  notes: string | null;
  academyName: string;
  createdAtLabel: string;
}

export function leadAcknowledgementSubject(academyName: string) {
  return `Thanks for your enquiry — ${academyName.trim() || "our academy"}`;
}

export function leadAcademyNotificationSubject(
  leadName: string,
  audience: "adult" | "child_teen" | null = null,
) {
  const name = leadName.trim() || "Lead";

  if (audience === "adult") {
    return `New Adult Trial Enquiry - ${name}`;
  }

  if (audience === "child_teen") {
    return `New Kids Trial Enquiry - ${name}`;
  }

  return `New trial enquiry — ${name}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatOptionalNotes(notes: string | null) {
  const trimmed = notes?.trim();

  return trimmed || "—";
}

export function buildLeadAcknowledgementHtml(content: LeadEmailContent) {
  return `
    <p>Hi ${escapeHtml(content.leadName)},</p>
    <p>Thank you for your enquiry about training at <strong>${escapeHtml(content.academyName)}</strong>.</p>
    <p>We have received your details and a member of our team will be in touch shortly regarding your free trial.</p>
    <p>We normally respond within 24 hours.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Programme interest</td><td>${escapeHtml(content.programmeInterestLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Experience level</td><td>${escapeHtml(content.experienceLevelLabel)}</td></tr>
    </table>
    <p>If you have any questions in the meantime, simply reply to this email.</p>
  `.trim();
}

export function buildLeadAcknowledgementText(content: LeadEmailContent) {
  return [
    `Hi ${content.leadName},`,
    "",
    `Thank you for your enquiry about training at ${content.academyName}.`,
    "",
    "We have received your details and a member of our team will be in touch shortly regarding your free trial.",
    "",
    "We normally respond within 24 hours.",
    "",
    `Programme interest: ${content.programmeInterestLabel}`,
    `Experience level: ${content.experienceLevelLabel}`,
    "",
    "If you have any questions in the meantime, simply reply to this email.",
  ].join("\n");
}

export function buildLeadAcademyNotificationHtml(content: LeadEmailContent) {
  const phone = content.leadPhone?.trim() || "—";
  const notes = formatOptionalNotes(content.notes);

  return `
    <p>A new trial enquiry was received for <strong>${escapeHtml(content.academyName)}</strong>.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td>${escapeHtml(content.leadName)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td>${escapeHtml(content.leadEmail)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Phone</td><td>${escapeHtml(phone)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Programme interest</td><td>${escapeHtml(content.programmeInterestLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Experience level</td><td>${escapeHtml(content.experienceLevelLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Notes</td><td>${escapeHtml(notes)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Submitted at</td><td>${escapeHtml(content.createdAtLabel)}</td></tr>
    </table>
  `.trim();
}

export function buildLeadAcademyNotificationText(content: LeadEmailContent) {
  const phone = content.leadPhone?.trim() || "—";
  const notes = formatOptionalNotes(content.notes);

  return [
    `New trial enquiry for ${content.academyName}`,
    "",
    `Name: ${content.leadName}`,
    `Email: ${content.leadEmail}`,
    `Phone: ${phone}`,
    `Programme interest: ${content.programmeInterestLabel}`,
    `Experience level: ${content.experienceLevelLabel}`,
    `Notes: ${notes}`,
    `Submitted at: ${content.createdAtLabel}`,
  ].join("\n");
}
