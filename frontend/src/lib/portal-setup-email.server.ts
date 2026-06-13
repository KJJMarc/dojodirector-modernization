import "server-only";

import { getAcademyEmailSettingsBySlug } from "@/lib/academy-email.server";
import { sendEmailForAcademy, sendPlatformEmail } from "@/lib/email.server";
import {
  buildPortalSetupEmailHtml,
  buildPortalSetupEmailText,
} from "@/lib/portal-setup-email.shared";
import { PORTAL_SETUP_SUBJECT } from "@/lib/portal-setup.shared";

export async function sendPortalSetupEmail(input: {
  clubSlug: string | null;
  to: string;
  setupLink: string;
  academyName: string | null;
}): Promise<void> {
  const html = buildPortalSetupEmailHtml({
    setupLink: input.setupLink,
    academyName: input.academyName,
  });
  const text = buildPortalSetupEmailText({
    setupLink: input.setupLink,
    academyName: input.academyName,
  });

  if (input.clubSlug) {
    const academy = await getAcademyEmailSettingsBySlug(input.clubSlug);

    if (!academy?.emailEnabled) {
      throw new Error(
        "Academy email is disabled. Enable email in Academy Email settings first.",
      );
    }

    await sendEmailForAcademy({
      clubSlug: input.clubSlug,
      to: input.to,
      subject: PORTAL_SETUP_SUBJECT,
      html,
      text,
    });
    return;
  }

  await sendPlatformEmail({
    to: input.to,
    subject: PORTAL_SETUP_SUBJECT,
    html,
    text,
  });
}
