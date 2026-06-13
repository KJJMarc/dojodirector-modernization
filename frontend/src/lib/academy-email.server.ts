import "server-only";

import {
  formatAcademyFromAddress,
  resolveAcademyPortalInviteEmailAvailability,
  resolveSenderDisplayName,
  type AcademyEmailSettings,
  type AcademyEmailSettingsFormState,
  type AcademyPortalInviteEmailAvailability,
  type GuestBookingEmailSettingsFormState,
} from "@/lib/academy-email.shared";
import { getClubBySlug, requireClubBySlug } from "@/lib/clubs.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface ClubEmailRow {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  reply_to_email: string | null;
  from_display_name: string | null;
  email_enabled: boolean | null;
  guest_booking_email_enabled: boolean | null;
  guest_booking_notify_academy: boolean | null;
}

const CLUB_EMAIL_COLUMNS =
  "id, name, slug, contact_email, reply_to_email, from_display_name, email_enabled, guest_booking_email_enabled, guest_booking_notify_academy";

function mapClubEmailRow(row: ClubEmailRow): AcademyEmailSettings | null {
  const contactEmail = row.contact_email?.trim() ?? "";
  const replyToEmail = row.reply_to_email?.trim() ?? "";

  if (!contactEmail || !replyToEmail) {
    return null;
  }

  return {
    clubId: row.id,
    clubSlug: row.slug,
    clubName: row.name,
    contactEmail,
    replyToEmail,
    senderDisplayName: resolveSenderDisplayName(row.from_display_name, row.name),
    emailEnabled: row.email_enabled ?? false,
    guestBookingEmailEnabled: row.guest_booking_email_enabled ?? true,
    guestBookingNotifyAcademy: row.guest_booking_notify_academy ?? true,
  };
}

function mapClubEmailFormRow(row: ClubEmailRow): AcademyEmailSettingsFormState {
  return {
    clubId: row.id,
    clubSlug: row.slug,
    clubName: row.name,
    contactEmail: row.contact_email?.trim() ?? "",
    replyToEmail: row.reply_to_email?.trim() ?? "",
    senderDisplayName: row.from_display_name?.trim() ?? "",
    emailEnabled: row.email_enabled ?? false,
  };
}

function mapGuestBookingEmailFormRow(row: ClubEmailRow): GuestBookingEmailSettingsFormState {
  return {
    clubId: row.id,
    clubSlug: row.slug,
    clubName: row.name,
    emailEnabled: row.email_enabled ?? false,
    guestBookingEmailEnabled: row.guest_booking_email_enabled ?? true,
    guestBookingNotifyAcademy: row.guest_booking_notify_academy ?? true,
  };
}

export async function loadAcademyEmailSettingsForEdit(
  clubSlug: string,
): Promise<AcademyEmailSettingsFormState> {
  const club = await requireClubBySlug(clubSlug);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select(CLUB_EMAIL_COLUMNS)
    .eq("id", club.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load academy email settings: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Club not found for slug "${clubSlug}".`);
  }

  return mapClubEmailFormRow(data as ClubEmailRow);
}

export async function updateAcademyEmailSettings(input: {
  clubId: string;
  contactEmail: string;
  replyToEmail: string;
  senderDisplayName: string;
  emailEnabled: boolean;
}): Promise<void> {
  const contactEmail = input.contactEmail.trim();
  const replyToEmail = input.replyToEmail.trim();

  if (!contactEmail || !replyToEmail) {
    throw new Error("Contact email and reply-to email are required.");
  }

  if (!isValidEmailAddress(contactEmail) || !isValidEmailAddress(replyToEmail)) {
    throw new Error("Enter valid email addresses for contact and reply-to.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: clubRow, error: clubError } = await supabase
    .from("clubs")
    .select("name")
    .eq("id", input.clubId)
    .maybeSingle();

  if (clubError) {
    throw new Error(`Failed to load academy: ${clubError.message}`);
  }

  if (!clubRow?.name) {
    throw new Error("Academy not found.");
  }

  const senderDisplayName = resolveSenderDisplayName(
    input.senderDisplayName,
    clubRow.name,
  );

  const { error } = await supabase
    .from("clubs")
    .update({
      contact_email: contactEmail,
      reply_to_email: replyToEmail,
      from_display_name: senderDisplayName,
      email_enabled: input.emailEnabled,
    })
    .eq("id", input.clubId);

  if (error) {
    throw new Error(`Failed to save academy email settings: ${error.message}`);
  }
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function getAcademyEmailSettingsByClubId(
  clubId: string,
): Promise<AcademyEmailSettings | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select(CLUB_EMAIL_COLUMNS)
    .eq("id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load academy email settings: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapClubEmailRow(data as ClubEmailRow);
}

export async function getAcademyEmailSettingsBySlug(
  clubSlug: string,
): Promise<AcademyEmailSettings | null> {
  const club = await getClubBySlug(clubSlug);

  if (!club) {
    return null;
  }

  return getAcademyEmailSettingsByClubId(club.id);
}

export async function getAcademyPortalInviteEmailAvailability(
  clubSlug: string,
): Promise<AcademyPortalInviteEmailAvailability> {
  const club = await getClubBySlug(clubSlug);

  if (!club) {
    return {
      canSendPortalInviteEmail: false,
      unavailableReason: "Academy not found.",
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("name, contact_email, reply_to_email, email_enabled")
    .eq("id", club.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load academy email settings: ${error.message}`);
  }

  if (!data) {
    return {
      canSendPortalInviteEmail: false,
      unavailableReason: "Academy not found.",
    };
  }

  return resolveAcademyPortalInviteEmailAvailability({
    clubName: data.name,
    contactEmail: data.contact_email,
    replyToEmail: data.reply_to_email,
    emailEnabled: data.email_enabled,
  });
}

export async function loadGuestBookingEmailSettingsForEdit(
  clubSlug: string,
): Promise<GuestBookingEmailSettingsFormState> {
  const club = await requireClubBySlug(clubSlug);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clubs")
    .select(CLUB_EMAIL_COLUMNS)
    .eq("id", club.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load guest booking email settings: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Club not found for slug "${clubSlug}".`);
  }

  return mapGuestBookingEmailFormRow(data as ClubEmailRow);
}

export async function updateGuestBookingEmailSettings(input: {
  clubId: string;
  guestBookingEmailEnabled: boolean;
  guestBookingNotifyAcademy: boolean;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("clubs")
    .update({
      guest_booking_email_enabled: input.guestBookingEmailEnabled,
      guest_booking_notify_academy: input.guestBookingNotifyAcademy,
    })
    .eq("id", input.clubId);

  if (error) {
    throw new Error(`Failed to save guest booking email settings: ${error.message}`);
  }
}

export async function requireAcademyEmailSettingsBySlug(
  clubSlug: string,
): Promise<AcademyEmailSettings> {
  const academy = await getAcademyEmailSettingsBySlug(clubSlug);

  if (!academy) {
    throw new Error(`Email settings are not configured for academy "${clubSlug}".`);
  }

  return academy;
}

export async function listAcademyEmailSettings(
  options: { enabledOnly?: boolean } = {},
): Promise<AcademyEmailSettings[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from("clubs").select(CLUB_EMAIL_COLUMNS).order("name");

  if (options.enabledOnly) {
    query = query.eq("email_enabled", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list academy email settings: ${error.message}`);
  }

  return ((data ?? []) as ClubEmailRow[])
    .map(mapClubEmailRow)
    .filter((row): row is AcademyEmailSettings => row !== null);
}

export function assertAcademyEmailEnabled(academy: AcademyEmailSettings) {
  if (!academy.emailEnabled) {
    throw new Error(`Email is disabled for ${academy.clubName}.`);
  }
}

export { formatAcademyFromAddress };
