import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { formatSessionLocation } from "@/lib/booking";
import { assertSessionIsBookableForClub } from "@/lib/class-session-booking-eligibility.server";
import {
  buildSessionDisplayLabels,
  resolveSessionLocationFromRow,
} from "@/lib/class-session-schedule";
import { resolveGuestTrainingAgreementContent } from "@/lib/club-agreement-templates.server";
import {
  type AdminGuestBookingRow,
  type GuestBookingResult,
  type GuestBookingSubmission,
  parseGuestBookingSubmission,
} from "@/lib/guest-booking.shared";
import { buildMembershipAgreementPdfBytes } from "@/lib/membership-agreement-pdf.server";
import {
  getGuestBookingAgreementPdfStoragePath,
} from "@/lib/student-agreement-storage.shared";
import { sendGuestBookingEmailsAfterBooking } from "@/lib/guest-booking-email.server";
import { createSessionAttendeeForGuestBooking } from "@/lib/guest-booking-session-attendee.server";
import { matchGuestBookingToLead } from "@/lib/lead-guest-booking-match.server";
import { assertClassSessionHasSpaceForBooking } from "@/lib/session-waitlist.server";
import { uploadGuestBookingAgreementPdf } from "@/lib/student-agreement-storage.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseErrorLike = { code?: string; message?: string } | null;

let guestBookingsTableAvailable: boolean | null = null;

export const GUEST_BOOKINGS_NOT_CONFIGURED_MESSAGE =
  "Guest bookings are not set up yet. Please run the database migration.";

function isMissingGuestBookingsTableError(error: SupabaseErrorLike) {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  if (error.code === "42P01") {
    return message.includes("guest_bookings");
  }

  if (error.code === "PGRST205" || error.code === "PGRST204") {
    return message.includes("guest_bookings");
  }

  return (
    message.includes("guest_bookings") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find"))
  );
}

export async function isGuestBookingsTableAvailable(): Promise<boolean> {
  if (guestBookingsTableAvailable !== null) {
    return guestBookingsTableAvailable;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("guest_bookings").select("id").limit(0);

  if (isMissingGuestBookingsTableError(error)) {
    guestBookingsTableAvailable = false;
    return false;
  }

  guestBookingsTableAvailable = !error;
  return guestBookingsTableAvailable;
}

export interface AdminGuestBookingsLoadResult {
  guestBookingsTableAvailable: boolean;
  bookings: AdminGuestBookingRow[];
}

const GUEST_BOOKING_LIST_COLUMNS =
  "id, first_name, last_name, email, phone, booking_status, agreement_pdf_path, created_at, session_id, club_id";

interface GuestBookingRecordRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  booking_status: string;
  agreement_pdf_path: string | null;
  created_at: string;
  session_id: string;
  club_id: string;
}

interface ClassSessionSummaryRow {
  id: string;
  starts_at: string;
  class_id: string;
}

interface ClassSummaryRow {
  id: string;
  name: string;
}

/** Resolves club from class_sessions.club_id, falling back to classes.club_id. */
async function resolveGuestBookingClubId(classSessionId: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data: session, error } = await supabase
    .from("class_sessions")
    .select("id, class_id, club_id")
    .eq("id", classSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class session: ${error.message}`);
  }

  if (!session) {
    throw new Error("Class session not found.");
  }

  if (session.club_id) {
    return session.club_id;
  }

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("club_id")
    .eq("id", session.class_id)
    .maybeSingle();

  if (classError) {
    throw new Error(`Unable to load class: ${classError.message}`);
  }

  if (!classRow?.club_id) {
    throw new Error("Unable to resolve club for this class session.");
  }

  return classRow.club_id;
}

async function fetchGuestBookingRowsForClub(clubId: string): Promise<GuestBookingRecordRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guest_bookings")
    .select(GUEST_BOOKING_LIST_COLUMNS)
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingGuestBookingsTableError(error)) {
      guestBookingsTableAvailable = false;
      return [];
    }

    console.error("[guest-bookings]", {
      kind: "list_load_failed",
      clubId,
      message: error.message,
    });
    return [];
  }

  guestBookingsTableAvailable = true;
  return (data ?? []) as GuestBookingRecordRow[];
}

const GUEST_BOOKING_LOOKUP_BATCH_SIZE = 100;

function chunkIds<T>(ids: T[], batchSize = GUEST_BOOKING_LOOKUP_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < ids.length; index += batchSize) {
    chunks.push(ids.slice(index, index + batchSize));
  }

  return chunks;
}

async function mapGuestBookingsToAdminRows(
  rows: GuestBookingRecordRow[],
): Promise<AdminGuestBookingRow[]> {
  if (rows.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const sessionIds = Array.from(new Set(rows.map((row) => row.session_id)));
  const sessions: ClassSessionSummaryRow[] = [];

  for (const sessionIdBatch of chunkIds(sessionIds)) {
    const { data: sessionRows, error: sessionsError } = await supabase
      .from("class_sessions")
      .select("id, starts_at, class_id")
      .in("id", sessionIdBatch);

    if (sessionsError) {
      console.error("[guest-bookings]", {
        kind: "session_lookup_failed",
        message: sessionsError.message,
      });
      continue;
    }

    sessions.push(...((sessionRows ?? []) as ClassSessionSummaryRow[]));
  }

  const classIds = Array.from(new Set(sessions.map((session) => session.class_id)));
  const classNameById = new Map<string, string>();

  for (const classIdBatch of chunkIds(classIds)) {
    const { data: classRows, error: classesError } = await supabase
      .from("classes")
      .select("id, name")
      .in("id", classIdBatch);

    if (classesError) {
      console.error("[guest-bookings]", {
        kind: "class_lookup_failed",
        message: classesError.message,
      });
      continue;
    }

    for (const row of (classRows ?? []) as ClassSummaryRow[]) {
      classNameById.set(row.id, row.name?.trim() || "Class");
    }
  }

  const sessionById = new Map(sessions.map((session) => [session.id, session]));

  return rows.map((row) => {
    const session = sessionById.get(row.session_id);
    const className = session
      ? (classNameById.get(session.class_id) ?? "Class")
      : "Class";

    return {
      id: row.id,
      createdAt: row.created_at,
      sessionStartsAt: session?.starts_at ?? row.created_at,
      className,
      guestName: getStudentFullName(row.first_name, row.last_name),
      email: row.email,
      phone: row.phone,
      bookingStatus: row.booking_status,
      agreementPdfPath: row.agreement_pdf_path,
    };
  });
}

async function loadClassSessionForGuestBooking(classSessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, club_id, starts_at, ends_at, capacity, status, source, external_id",
    )
    .eq("id", classSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Class session not found.");
  }

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("name, club_id")
    .eq("id", data.class_id)
    .maybeSingle();

  if (classError) {
    throw new Error(`Unable to load class: ${classError.message}`);
  }

  const clubId = data.club_id ?? classRow?.club_id ?? null;

  if (!clubId) {
    throw new Error("Unable to resolve club for this class session.");
  }

  await assertSessionIsBookableForClub(classSessionId, clubId);

  const location = resolveSessionLocationFromRow({
    source: data.source ?? null,
    external_id: data.external_id ?? null,
  });

  return {
    classSessionId: data.id,
    clubId,
    capacity: data.capacity,
    className: classRow?.name?.trim() || "Class",
    startsAt: data.starts_at,
    ...buildSessionDisplayLabels({
      startsAt: data.starts_at,
      endsAt: data.ends_at ?? null,
      externalId: data.external_id ?? null,
    }),
    location: formatSessionLocation(location),
  };
}

async function generateGuestBookingAgreementPdf(input: {
  clubId: string;
  bookingId: string;
  signedFullName: string;
  acceptedAt: string;
  signatoryType: GuestBookingSubmission["signatoryType"];
  participantName: string | null;
  relationshipToParticipant: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const agreementContent = await resolveGuestTrainingAgreementContent(input.clubId);

  const pdfBytes = await buildMembershipAgreementPdfBytes({
    agreementRecordId: input.bookingId,
    signedFullName: input.signedFullName,
    acceptedAt: input.acceptedAt,
    version: agreementContent.version,
    documentTitle: agreementContent.pdfDocumentTitle,
    sections: agreementContent.sections,
    signatoryType: input.signatoryType,
    participantName: input.participantName,
    relationshipToParticipant: input.relationshipToParticipant,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const pdfPath = await uploadGuestBookingAgreementPdf(
    input.bookingId,
    agreementContent.version,
    pdfBytes,
  );

  const expectedPath = getGuestBookingAgreementPdfStoragePath(
    input.bookingId,
    agreementContent.version,
  );

  if (pdfPath !== expectedPath) {
    throw new Error("Guest agreement PDF was stored at an unexpected location.");
  }

  return pdfPath;
}

export async function submitGuestBooking(
  rawInput: GuestBookingSubmission,
  requestMeta?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    expectedClubId?: string;
  },
): Promise<GuestBookingResult> {
  const submission = parseGuestBookingSubmission(rawInput);
  const session = await loadClassSessionForGuestBooking(submission.classSessionId);
  const clubId = await resolveGuestBookingClubId(submission.classSessionId);

  if (requestMeta?.expectedClubId && clubId !== requestMeta.expectedClubId) {
    throw new Error("This class is not available for booking at this club.");
  }

  const guestName = getStudentFullName(submission.firstName, submission.lastName);
  const acceptedAt = new Date().toISOString();
  const agreementContent = await resolveGuestTrainingAgreementContent(clubId);
  const supabase = getSupabaseAdminClient();

  await assertClassSessionHasSpaceForBooking(
    submission.classSessionId,
    session.capacity,
    { skipExpiryProcessing: true },
  );

  const { data: bookingRow, error: insertError } = await supabase
    .from("guest_bookings")
    .insert({
      club_id: clubId,
      session_id: submission.classSessionId,
      first_name: submission.firstName,
      last_name: submission.lastName,
      email: submission.email,
      phone: submission.phone,
      booking_status: "booked",
      signed_full_name: submission.signedFullName,
      signatory_type: submission.signatoryType,
      participant_name: submission.participantName,
      relationship_to_participant: submission.relationshipToParticipant,
      agreement_version: agreementContent.version,
      accepted_at: acceptedAt,
      ip_address: requestMeta?.ipAddress ?? null,
      user_agent: requestMeta?.userAgent ?? null,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    throw new Error(`Unable to save guest booking: ${insertError.message}`);
  }

  const bookingId = (bookingRow as { id: string } | null)?.id;

  if (!bookingId) {
    throw new Error("Unable to save guest booking: missing booking id.");
  }

  try {
    await createSessionAttendeeForGuestBooking({
      guestBookingId: bookingId,
      sessionId: submission.classSessionId,
      bookedAt: acceptedAt,
    });
  } catch (registerError) {
    await supabase.from("guest_bookings").delete().eq("id", bookingId);
    throw registerError;
  }

  try {
    const pdfPath = await generateGuestBookingAgreementPdf({
      clubId,
      bookingId,
      signedFullName: submission.signedFullName,
      acceptedAt,
      signatoryType: submission.signatoryType,
      participantName: submission.participantName,
      relationshipToParticipant: submission.relationshipToParticipant,
      ipAddress: requestMeta?.ipAddress ?? null,
      userAgent: requestMeta?.userAgent ?? null,
    });

    const { error: pdfUpdateError } = await supabase
      .from("guest_bookings")
      .update({ agreement_pdf_path: pdfPath })
      .eq("id", bookingId);

    if (pdfUpdateError) {
      console.error("Failed to link guest agreement PDF:", pdfUpdateError.message);
    }
  } catch (pdfError) {
    console.error("Guest booking agreement PDF generation failed:", pdfError);
  }

  await matchGuestBookingToLead({
    academyId: clubId,
    bookingId,
    guestName,
    email: submission.email,
    phone: submission.phone,
    className: session.className,
    dateLabel: session.dateLabel,
    timeLabel: session.timeLabel,
    bookedAtIso: acceptedAt,
  });

  await sendGuestBookingEmailsAfterBooking({
    clubId,
    bookingId,
    guestName,
    guestEmail: submission.email,
    className: session.className,
    dateLabel: session.dateLabel,
    timeLabel: session.timeLabel,
    location: session.location,
    createdAtIso: acceptedAt,
  });

  return {
    bookingId,
    guestName,
    email: submission.email,
    phone: submission.phone,
    className: session.className,
    dateLabel: session.dateLabel,
    timeLabel: session.timeLabel,
    location: session.location,
  };
}

export async function loadAdminGuestBookings(
  clubId: string,
  searchQuery?: string,
): Promise<AdminGuestBookingsLoadResult> {
  if (!(await isGuestBookingsTableAvailable())) {
    return {
      guestBookingsTableAvailable: false,
      bookings: [],
    };
  }

  const bookings = await getAdminGuestBookings(clubId, searchQuery);

  return {
    guestBookingsTableAvailable: true,
    bookings,
  };
}

async function getAdminGuestBookings(
  clubId: string,
  searchQuery?: string,
): Promise<AdminGuestBookingRow[]> {
  const rows = await fetchGuestBookingRowsForClub(clubId);
  const mapped = await mapGuestBookingsToAdminRows(rows);
  const query = searchQuery?.trim().toLowerCase();

  if (!query) {
    return mapped;
  }

  return mapped.filter(
    (row) =>
      row.guestName.toLowerCase().includes(query) ||
      row.email.toLowerCase().includes(query),
  );
}

export async function getGuestBookingAgreementPdfPath(
  bookingId: string,
  clubId: string,
): Promise<string | null> {
  if (!(await isGuestBookingsTableAvailable())) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guest_bookings")
    .select("agreement_pdf_path")
    .eq("id", bookingId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    if (isMissingGuestBookingsTableError(error)) {
      guestBookingsTableAvailable = false;
      return null;
    }

    throw new Error(`Failed to load guest booking: ${error.message}`);
  }

  return data?.agreement_pdf_path?.trim() ?? null;
}
