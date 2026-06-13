import { clubAdminPath } from "@/lib/clubs.shared";

export interface AcademyEmailSettings {
  clubId: string;
  clubSlug: string;
  clubName: string;
  contactEmail: string;
  replyToEmail: string;
  /** Stored sender display name (`clubs.from_display_name` / sender_display_name). */
  senderDisplayName: string;
  emailEnabled: boolean;
  guestBookingEmailEnabled: boolean;
  guestBookingNotifyAcademy: boolean;
}

/** Editable academy email fields (allows empty values before first save). */
export interface AcademyEmailSettingsFormState {
  clubId: string;
  clubSlug: string;
  clubName: string;
  contactEmail: string;
  replyToEmail: string;
  senderDisplayName: string;
  emailEnabled: boolean;
}

export interface GuestBookingEmailSettingsFormState {
  clubId: string;
  clubSlug: string;
  clubName: string;
  emailEnabled: boolean;
  guestBookingEmailEnabled: boolean;
  guestBookingNotifyAcademy: boolean;
}

export interface AcademyEmailHeadersPreview {
  from: string;
  replyTo: string;
}

export function clubAcademyEmailSettingsPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "messaging/email-settings");
}

export function clubGuestBookingEmailSettingsPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "messaging/guest-booking-email-settings");
}

export interface AcademyPortalInviteEmailAvailability {
  canSendPortalInviteEmail: boolean;
  unavailableReason: string | null;
}

/** Whether an academy can send student portal setup/invite emails. */
export function resolveAcademyPortalInviteEmailAvailability(input: {
  clubName: string;
  contactEmail: string | null | undefined;
  replyToEmail: string | null | undefined;
  emailEnabled: boolean | null | undefined;
}): AcademyPortalInviteEmailAvailability {
  const clubName = input.clubName.trim() || "this academy";
  const contactEmail = input.contactEmail?.trim() ?? "";
  const replyToEmail = input.replyToEmail?.trim() ?? "";

  if (!contactEmail || !replyToEmail) {
    return {
      canSendPortalInviteEmail: false,
      unavailableReason: `Portal invites are unavailable until ${clubName} contact and reply-to emails are configured in Academy Email settings.`,
    };
  }

  if (!input.emailEnabled) {
    return {
      canSendPortalInviteEmail: false,
      unavailableReason: `Portal invites are unavailable because academy email is disabled for ${clubName}. Enable email in Academy Email settings first.`,
    };
  }

  return {
    canSendPortalInviteEmail: true,
    unavailableReason: null,
  };
}

/** Resolve sender display name, defaulting to the academy name when unset. */
export function resolveSenderDisplayName(
  storedSenderDisplayName: string | null | undefined,
  clubName: string,
): string {
  const trimmed = storedSenderDisplayName?.trim() ?? "";

  if (trimmed) {
    return trimmed;
  }

  return clubName.trim();
}

export function extractPlatformSenderAddress(platformFromEmail: string): string {
  const trimmed = platformFromEmail.trim();
  const angleMatch = trimmed.match(/<([^>]+)>/);

  return angleMatch?.[1]?.trim() ?? trimmed;
}

/** Build Resend From header using academy display name and platform sending address. */
export function formatAcademyFromAddress(
  academy: Pick<AcademyEmailSettings, "senderDisplayName" | "clubName">,
  platformFromEmail: string,
): string {
  const sendingAddress = extractPlatformSenderAddress(platformFromEmail);
  const displayName = resolveSenderDisplayName(
    academy.senderDisplayName,
    academy.clubName,
  );

  return `${displayName} <${sendingAddress}>`;
}

export function buildAcademyEmailHeadersPreview(input: {
  senderDisplayName: string;
  clubName: string;
  replyToEmail: string;
  platformSenderEmail: string | null;
}): AcademyEmailHeadersPreview {
  const platformAddress = input.platformSenderEmail
    ? extractPlatformSenderAddress(input.platformSenderEmail)
    : "platform sender not configured";

  return {
    from: formatAcademyFromAddress(
      {
        senderDisplayName: input.senderDisplayName,
        clubName: input.clubName,
      },
      input.platformSenderEmail ?? platformAddress,
    ),
    replyTo: input.replyToEmail.trim() || "—",
  };
}

/** Distinct academy inboxes that should receive admin notification emails. */
export function resolveAcademyNotificationRecipients(
  academy: Pick<AcademyEmailSettings, "contactEmail" | "replyToEmail">,
): string[] {
  const recipients = new Set<string>();
  const contactEmail = academy.contactEmail.trim();
  const replyToEmail = academy.replyToEmail.trim();

  if (contactEmail) {
    recipients.add(contactEmail);
  }

  if (replyToEmail) {
    recipients.add(replyToEmail);
  }

  return Array.from(recipients);
}
