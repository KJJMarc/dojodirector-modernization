import "server-only";

import {
  appendLeadNote,
  buildGuestBookingLeadNote,
  normalizeLeadMatchEmail,
} from "@/lib/lead-guest-booking-match.shared";
import { findCanonicalLeadForMatch } from "@/lib/lead-match.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

interface LeadMatchRow {
  id: string;
  email: string;
  phone: string | null;
  notes: string | null;
}

export interface GuestBookingLeadMatchInput {
  academyId: string;
  bookingId: string;
  guestName: string;
  email: string;
  phone: string | null;
  className: string;
  dateLabel: string;
  timeLabel: string;
  bookedAtIso: string;
}

function isMissingLeadsOrLinkColumnError(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes('relation "leads" does not exist') ||
    message.includes('relation "public.leads" does not exist') ||
    message.includes("column guest_bookings.lead_id does not exist") ||
    message.includes("column leads.academy_id does not exist")
  );
}

async function linkBookingToLead(bookingId: string, leadId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("guest_bookings")
    .update({ lead_id: leadId })
    .eq("id", bookingId);

  if (error && !isMissingLeadsOrLinkColumnError(error)) {
    throw new Error(`Failed to link guest booking to lead: ${error.message}`);
  }
}

async function updateMatchedLead(input: {
  academyId: string;
  lead: LeadMatchRow;
  noteEntry: string;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("leads")
    .update({
      status: "trial_booked",
      trial_booked_at: now,
      last_activity_at: now,
      notes: appendLeadNote(input.lead.notes, input.noteEntry),
      updated_at: now,
    })
    .eq("academy_id", input.academyId)
    .eq("id", input.lead.id);

  if (error) {
    throw new Error(`Failed to update matched lead: ${error.message}`);
  }
}

async function createLeadFromGuestBooking(input: GuestBookingLeadMatchInput) {
  const supabase = getSupabaseAdminClient();
  const noteEntry = buildGuestBookingLeadNote({
    className: input.className,
    dateLabel: input.dateLabel,
    timeLabel: input.timeLabel,
    bookedAtIso: input.bookedAtIso,
  });
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      academy_id: input.academyId,
      full_name: input.guestName.trim(),
      email: normalizeLeadMatchEmail(input.email) ?? input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      programme_interest: "not_sure",
      experience_level: "not_sure",
      lead_source: "website",
      status: "trial_booked",
      submitted_at: now,
      trial_booked_at: now,
      last_activity_at: now,
      notes: noteEntry,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingLeadsOrLinkColumnError(error)) {
      return null;
    }

    throw new Error(`Failed to create lead from guest booking: ${error.message}`);
  }

  return data.id as string;
}

/**
 * Match a guest booking to an existing lead (email, then phone) or create a new lead.
 * Never throws — booking success must not depend on lead matching.
 */
export async function matchGuestBookingToLead(
  input: GuestBookingLeadMatchInput,
): Promise<void> {
  try {
    const noteEntry = buildGuestBookingLeadNote({
      className: input.className,
      dateLabel: input.dateLabel,
      timeLabel: input.timeLabel,
      bookedAtIso: input.bookedAtIso,
    });

    const matchedLead = await findCanonicalLeadForMatch({
      academyId: input.academyId,
      email: input.email,
      phone: input.phone,
    });

    if (matchedLead) {
      await updateMatchedLead({
        academyId: input.academyId,
        lead: matchedLead,
        noteEntry,
      });
      await linkBookingToLead(input.bookingId, matchedLead.id);
      return;
    }

    const createdLeadId = await createLeadFromGuestBooking(input);

    if (createdLeadId) {
      await linkBookingToLead(input.bookingId, createdLeadId);
    }
  } catch (error) {
    console.error("[lead-guest-booking-match]", {
      bookingId: input.bookingId,
      academyId: input.academyId,
      message: error instanceof Error ? error.message : "Lead matching failed.",
    });
  }
}
