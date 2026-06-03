"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import { clubGuestBookingEmailSettingsPath } from "@/lib/academy-email.shared";
import {
  loadGuestBookingEmailSettingsForEdit,
  updateGuestBookingEmailSettings,
} from "@/lib/academy-email.server";
import { sendGuestBookingTestConfirmationEmail } from "@/lib/guest-booking-email.server";
import { clubAdminPath } from "@/lib/clubs.shared";

export type GuestBookingEmailSettingsActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function isValidRecipientEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function saveGuestBookingEmailSettingsAction(
  formData: FormData,
): Promise<GuestBookingEmailSettingsActionResult> {
  try {
    const clubSlug = String(formData.get("clubSlug") ?? "").trim();
    const { club } = await requireAdminAccessForClubSlug(clubSlug);

    await updateGuestBookingEmailSettings({
      clubId: club.id,
      guestBookingEmailEnabled: formData.get("guestBookingEmailEnabled") === "on",
      guestBookingNotifyAcademy: formData.get("guestBookingNotifyAcademy") === "on",
    });

    revalidatePath(clubAdminPath(club.slug, "messaging"));
    revalidatePath(clubGuestBookingEmailSettingsPath(club.slug));

    return { ok: true, message: "Guest booking email settings saved." };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save guest booking email settings.",
    };
  }
}

export async function sendGuestBookingTestEmailAction(
  formData: FormData,
): Promise<GuestBookingEmailSettingsActionResult> {
  try {
    const clubSlug = String(formData.get("clubSlug") ?? "").trim();
    const recipientEmail = String(formData.get("recipientEmail") ?? "").trim().toLowerCase();

    await requireAdminAccessForClubSlug(clubSlug);

    if (!recipientEmail || !isValidRecipientEmail(recipientEmail)) {
      return { ok: false, error: "Enter a valid recipient email address." };
    }

    const settings = await loadGuestBookingEmailSettingsForEdit(clubSlug);

    if (!settings.emailEnabled) {
      return {
        ok: false,
        error: "Academy email is disabled. Configure Set Academy Email first.",
      };
    }

    await sendGuestBookingTestConfirmationEmail({
      clubSlug,
      recipientEmail,
    });

    return {
      ok: true,
      message: `Test guest booking confirmation sent to ${recipientEmail}.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send test email.",
    };
  }
}
