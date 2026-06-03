"use server";

import { requireAdminLoginSession } from "@/lib/admin-auth.server";
import { listAdminEmailTestAcademies } from "@/lib/admin-email-test.server";
import { sendEmailForAcademy } from "@/lib/email.server";

export type AdminEmailTestActionResult =
  | {
      ok: true;
      messageId: string;
      from: string;
      replyTo: string;
    }
  | {
      ok: false;
      error: string;
    };

function isValidRecipientEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function sendAdminEmailTestAction(
  formData: FormData,
): Promise<AdminEmailTestActionResult> {
  try {
    const { authUserId } = await requireAdminLoginSession();
    const clubSlug = String(formData.get("clubSlug") ?? "").trim();
    const recipientEmail = String(formData.get("recipientEmail") ?? "").trim().toLowerCase();

    if (!clubSlug) {
      return { ok: false, error: "Select an academy." };
    }

    if (!recipientEmail || !isValidRecipientEmail(recipientEmail)) {
      return { ok: false, error: "Enter a valid recipient email address." };
    }

    const allowedAcademies = await listAdminEmailTestAcademies(authUserId);
    const academy = allowedAcademies.find((entry) => entry.clubSlug === clubSlug);

    if (!academy) {
      return { ok: false, error: "You do not have permission to send email for that academy." };
    }

    const result = await sendEmailForAcademy({
      clubSlug,
      to: recipientEmail,
      subject: `Dojo Director test email — ${academy.clubName}`,
      html: `
        <p>This is a test email from Dojo Director for <strong>${academy.clubName}</strong>.</p>
        <p>If you reply to this message, your reply should go to the academy reply-to address.</p>
        <p style="color:#666;font-size:12px;">Sent from the admin email test page.</p>
      `.trim(),
      text: `This is a test email from Dojo Director for ${academy.clubName}. Reply to confirm reply-to routing.`,
    });

    return {
      ok: true,
      messageId: result.id,
      from: result.from,
      replyTo: result.replyTo,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send test email.",
    };
  }
}
