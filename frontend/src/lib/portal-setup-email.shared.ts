import { PORTAL_SETUP_SUBJECT } from "@/lib/portal-setup.shared";

export { PORTAL_SETUP_SUBJECT };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildPortalSetupEmailHtml(input: {
  setupLink: string;
  academyName: string | null;
}) {
  const academyLine = input.academyName
    ? `<p><strong>${escapeHtml(input.academyName)}</strong> invited you to set up your Dojo Director account.</p>`
    : "<p>You have been invited to set up your Dojo Director account.</p>";

  return `
    ${academyLine}
    <p>Use the link below to choose a password and access your portal:</p>
    <p><a href="${escapeHtml(input.setupLink)}" style="color:#c41e3a;font-weight:600;">Set up your account</a></p>
    <p style="color:#666;font-size:13px;">This link expires after a short period for your security (typically within one hour). If you were not expecting this email, you can safely ignore it.</p>
    <p style="color:#666;font-size:12px;">If the button does not work, copy and paste this link into your browser:<br />${escapeHtml(input.setupLink)}</p>
  `.trim();
}

export function buildPortalSetupEmailText(input: {
  setupLink: string;
  academyName: string | null;
}) {
  const lines = [
    input.academyName
      ? `${input.academyName} invited you to set up your Dojo Director account.`
      : "You have been invited to set up your Dojo Director account.",
    "",
    `Set up your account: ${input.setupLink}`,
    "",
    "This link expires after a short period for your security (typically within one hour).",
    "If you were not expecting this email, you can safely ignore it.",
  ];

  return lines.join("\n");
}
