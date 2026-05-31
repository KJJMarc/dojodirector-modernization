import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import {
  formatBookingDate,
  formatBookingTime,
  formatSessionLocation,
} from "@/lib/booking";
import { resolveSessionLocationFromRow } from "@/lib/class-session-schedule";
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

async function getClassSessionIdsForClub(clubId: string): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id")
    .eq("club_id", clubId);

  if (classesError) {
    throw new Error(`Failed to load club classes: ${classesError.message}`);
  }

  const classIds = (classes ?? []).map((row) => row.id as string);

  if (classIds.length === 0) {
    return [];
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id")
    .in("class_id", classIds);

  if (sessionsError) {
    throw new Error(`Failed to load club class sessions: ${sessionsError.message}`);
  }

  return (sessions ?? []).map((row) => row.id as string);
}

async function fetchGuestBookingRowsForClub(clubId: string): Promise<GuestBookingRecordRow[]> {
  const supabase = getSupabaseAdminClient();
  const sessionIds = await getClassSessionIdsForClub(clubId);

  const [byClubIdResult, bySessionResult] = await Promise.all([
    supabase
      .from("guest_bookings")
      .select(GUEST_BOOKING_LIST_COLUMNS)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    sessionIds.length > 0
      ? supabase
          .from("guest_bookings")
          .select(GUEST_BOOKING_LIST_COLUMNS)
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const listError = byClubIdResult.error ?? bySessionResult.error;

  if (listError) {
    if (isMissingGuestBookingsTableError(listError)) {
      guestBookingsTableAvailable = false;
      return [];
    }

    throw new Error(`Failed to load guest bookings: ${listError.message}`);
  }

  guestBookingsTableAvailable = true;

  const merged = new Map<string, GuestBookingRecordRow>();

  for (const row of [
    ...((byClubIdResult.data ?? []) as GuestBookingRecordRow[]),
    ...((bySessionResult.data ?? []) as GuestBookingRecordRow[]),
  ]) {
    merged.set(row.id, row);
  }

  return Array.from(merged.values()).sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
}

async function mapGuestBookingsToAdminRows(
  rows: GuestBookingRecordRow[],
): Promise<AdminGuestBookingRow[]> {
  if (rows.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const sessionIds = Array.from(new Set(rows.map((row) => row.session_id)));

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id, starts_at, class_id")
    .in("id", sessionIds);

  if (sessionsError) {
    throw new Error(`Failed to load class sessions: ${sessionsError.message}`);
  }

  const sessions = (sessionRows ?? []) as ClassSessionSummaryRow[];
  const classIds = Array.from(new Set(sessions.map((session) => session.class_id)));

  const { data: classRows, error: classesError } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);

  if (classesError) {
    throw new Error(`Failed to load classes: ${classesError.message}`);
  }

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const classNameById = new Map(
    ((classRows ?? []) as ClassSummaryRow[]).map((row) => [row.id, row.name?.trim() || "Class"]),
  );

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
    .select("id, class_id, club_id, starts_at, ends_at, capacity, status, source, external_id")
    .eq("id", classSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Class session not found.");
  }

  if (data.status && data.status !== "scheduled") {
    throw new Error("This class session is not available to book.");
  }

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("name, club_id")
    .eq("id", data.class_id)
    .maybeSingle();

  if (classError) {
    throw new Error(`Unable to load class: ${classError.message}`);
  }

  const location = resolveSessionLocationFromRow({
    source: data.source ?? null,
    external_id: data.external_id ?? null,
  });

  const clubId = data.club_id ?? classRow?.club_id ?? null;

  if (!clubId) {
    throw new Error("Unable to resolve club for this class session.");
  }

  return {
    classSessionId: data.id,
    clubId,
    className: classRow?.name?.trim() || "Class",
    startsAt: data.starts_at,
    dateLabel: formatBookingDate(data.starts_at),
    timeLabel: formatBookingTime(data.starts_at),
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
  // TODO: When Resend is configured, send guest booking notification to:
  // admin@kingstonjiujitsu.com

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
