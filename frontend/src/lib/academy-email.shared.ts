import { clubAdminPath } from "@/lib/clubs.shared";

export interface AcademyEmailSettings {
  clubId: string;
  clubSlug: string;
  clubName: string;
  contactEmail: string;
  replyToEmail: string;
  fromDisplayName: string;
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
  fromDisplayName: string;
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

export function clubAcademyEmailSettingsPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "messaging/email-settings");
}

export function clubGuestBookingEmailSettingsPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "messaging/guest-booking-email-settings");
}

/** Build Resend From header using academy display name and platform sending address. */
export function formatAcademyFromAddress(
  academy: Pick<AcademyEmailSettings, "fromDisplayName">,
  platformFromEmail: string,
): string {
  const trimmedPlatform = platformFromEmail.trim();
  const angleMatch = trimmedPlatform.match(/<([^>]+)>/);
  const sendingAddress = angleMatch?.[1]?.trim() ?? trimmedPlatform;

  return `${academy.fromDisplayName.trim()} <${sendingAddress}>`;
}
