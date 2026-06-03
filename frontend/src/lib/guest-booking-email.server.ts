import "server-only";

import {
  getAcademyEmailSettingsByClubId,
  requireAcademyEmailSettingsBySlug,
} from "@/lib/academy-email.server";
import type { AcademyEmailSettings } from "@/lib/academy-email.shared";
import { sendEmailForAcademy } from "@/lib/email.server";
import {
  buildGuestBookingAcademyNotificationHtml,
  buildGuestBookingAcademyNotificationText,
  buildGuestBookingConfirmationHtml,
  buildGuestBookingConfirmationText,
  guestBookingAcademyNotificationSubject,
  guestBookingConfirmationSubject,
  type GuestBookingEmailContent,
} from "@/lib/guest-booking-email.shared";

export interface GuestBookingEmailDispatchInput {
  clubId: string;
  bookingId: string;
  guestName: string;
  guestEmail: string;
  className: string;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
  createdAtIso: string;
}

function formatCreatedAtLabel(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function logGuestBookingEmailFailure(input: {
  bookingId: string;
  clubSlug: string;
  kind: "guest" | "academy";
  message: string;
}) {
  console.error("[guest-booking-email]", {
    bookingId: input.bookingId,
    clubSlug: input.clubSlug,
    kind: input.kind,
    message: input.message,
  });
}

function resolveAcademyNotificationRecipient(academy: AcademyEmailSettings) {
  return academy.contactEmail.trim() || academy.replyToEmail.trim();
}

function buildEmailContent(
  input: GuestBookingEmailDispatchInput,
  academy: AcademyEmailSettings,
): GuestBookingEmailContent {
  return {
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    className: input.className,
    dateLabel: input.dateLabel,
    timeLabel: input.timeLabel,
    location: input.location,
    academyName: academy.clubName,
    createdAtLabel: formatCreatedAtLabel(input.createdAtIso),
  };
}

async function sendGuestConfirmationEmail(
  clubSlug: string,
  bookingId: string,
  academy: AcademyEmailSettings,
  content: GuestBookingEmailContent,
) {
  try {
    await sendEmailForAcademy({
      clubSlug,
      to: content.guestEmail,
      subject: guestBookingConfirmationSubject(content.className),
      html: buildGuestBookingConfirmationHtml(content),
      text: buildGuestBookingConfirmationText(content),
    });
  } catch (error) {
    logGuestBookingEmailFailure({
      bookingId,
      clubSlug,
      kind: "guest",
      message: error instanceof Error ? error.message : "Guest confirmation email failed.",
    });
  }
}

async function sendAcademyNotificationEmail(
  clubSlug: string,
  bookingId: string,
  academy: AcademyEmailSettings,
  content: GuestBookingEmailContent,
) {
  const recipient = resolveAcademyNotificationRecipient(academy);

  if (!recipient) {
    logGuestBookingEmailFailure({
      bookingId,
      clubSlug,
      kind: "academy",
      message: "Academy contact email is not configured.",
    });
    return;
  }

  try {
    await sendEmailForAcademy({
      clubSlug,
      to: recipient,
      subject: guestBookingAcademyNotificationSubject(content.className),
      html: buildGuestBookingAcademyNotificationHtml(content),
      text: buildGuestBookingAcademyNotificationText(content),
    });
  } catch (error) {
    logGuestBookingEmailFailure({
      bookingId,
      clubSlug,
      kind: "academy",
      message: error instanceof Error ? error.message : "Academy notification email failed.",
    });
  }
}

/**
 * Sends guest booking emails after a successful booking insert.
 * Never throws — booking success must not depend on email delivery.
 */
export async function sendGuestBookingEmailsAfterBooking(
  input: GuestBookingEmailDispatchInput,
): Promise<void> {
  try {
    const academy = await getAcademyEmailSettingsByClubId(input.clubId);

    if (!academy?.emailEnabled) {
      return;
    }

    const content = buildEmailContent(input, academy);

    if (academy.guestBookingEmailEnabled) {
      await sendGuestConfirmationEmail(academy.clubSlug, input.bookingId, academy, content);
    }

    if (academy.guestBookingNotifyAcademy) {
      await sendAcademyNotificationEmail(academy.clubSlug, input.bookingId, academy, content);
    }
  } catch (error) {
    console.error("[guest-booking-email]", {
      bookingId: input.bookingId,
      clubId: input.clubId,
      kind: "dispatch",
      message:
        error instanceof Error ? error.message : "Guest booking email dispatch failed.",
    });
  }
}

export async function sendGuestBookingTestConfirmationEmail(input: {
  clubSlug: string;
  recipientEmail: string;
}): Promise<void> {
  const academy = await requireAcademyEmailSettingsBySlug(input.clubSlug);

  if (!academy.emailEnabled) {
    throw new Error("Academy email is disabled. Enable email in Set Academy Email first.");
  }

  if (!academy.guestBookingEmailEnabled) {
    throw new Error("Guest booking confirmation emails are disabled for this academy.");
  }

  const content: GuestBookingEmailContent = {
    guestName: "Test Guest",
    guestEmail: input.recipientEmail.trim(),
    className: "Sample Class",
    dateLabel: "Monday 1 January 2026",
    timeLabel: "10:00",
    location: "Main mat",
    academyName: academy.clubName,
    createdAtLabel: formatCreatedAtLabel(new Date().toISOString()),
  };

  await sendEmailForAcademy({
    clubSlug: input.clubSlug,
    to: input.recipientEmail.trim(),
    subject: guestBookingConfirmationSubject("Sample Class"),
    html: buildGuestBookingConfirmationHtml(content),
    text: buildGuestBookingConfirmationText(content),
  });
}
