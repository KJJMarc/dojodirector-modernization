import "server-only";

import { getAcademyEmailSettingsBySlug } from "@/lib/academy-email.server";
import { sendEmailForAcademy, sendPlatformEmail } from "@/lib/email.server";
import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailText,
  PASSWORD_RESET_SUBJECT,
} from "@/lib/password-reset-email.shared";

export async function sendPasswordResetEmail(input: {
  clubSlug: string | null;
  to: string;
  resetLink: string;
  academyName: string | null;
}): Promise<void> {
  const html = buildPasswordResetEmailHtml({
    resetLink: input.resetLink,
    academyName: input.academyName,
  });
  const text = buildPasswordResetEmailText({
    resetLink: input.resetLink,
    academyName: input.academyName,
  });

  if (input.clubSlug) {
    const academy = await getAcademyEmailSettingsBySlug(input.clubSlug);

    if (!academy?.emailEnabled) {
      return;
    }

    await sendEmailForAcademy({
      clubSlug: input.clubSlug,
      to: input.to,
      subject: PASSWORD_RESET_SUBJECT,
      html,
      text,
    });
    return;
  }

  await sendPlatformEmail({
    to: input.to,
    subject: PASSWORD_RESET_SUBJECT,
    html,
    text,
  });
}
