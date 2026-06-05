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
