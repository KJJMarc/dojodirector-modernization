import { portalAuthLinkExpiryEmailLine } from "@/lib/portal-auth-link.shared";
import { PASSWORD_RESET_SUBJECT } from "@/lib/password-reset.shared";

export { PASSWORD_RESET_SUBJECT };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildPasswordResetEmailHtml(input: {
  resetLink: string;
  academyName: string | null;
}) {
  const academyLine = input.academyName
    ? `<p>This request was associated with <strong>${escapeHtml(input.academyName)}</strong>.</p>`
    : "";

  return `
    <p>You requested a password reset for your Dojo Director account.</p>
    ${academyLine}
    <p><a href="${escapeHtml(input.resetLink)}" style="color:#c41e3a;font-weight:600;">Reset your password</a></p>
    <p style="color:#666;font-size:13px;">${portalAuthLinkExpiryEmailLine()} If you did not request a password reset, you can safely ignore this email.</p>
    <p style="color:#666;font-size:12px;">If the button does not work, copy and paste this link into your browser:<br />${escapeHtml(input.resetLink)}</p>
  `.trim();
}

export function buildPasswordResetEmailText(input: {
  resetLink: string;
  academyName: string | null;
}) {
  const lines = [
    "You requested a password reset for your Dojo Director account.",
    input.academyName ? `Academy: ${input.academyName}` : "",
    "",
    `Reset your password: ${input.resetLink}`,
    "",
    portalAuthLinkExpiryEmailLine(),
    "If you did not request a password reset, you can safely ignore this email.",
  ];

  return lines.filter(Boolean).join("\n");
}
