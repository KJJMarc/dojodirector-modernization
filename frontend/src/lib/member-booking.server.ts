import "server-only";

import { revalidatePath } from "next/cache";
import { buildSessionDisplayLabels } from "@/lib/class-session-schedule";
import { assertSessionIsBookableForClub } from "@/lib/class-session-booking-eligibility.server";
import { resolveSessionLocationFromRow } from "@/lib/class-session-schedule";
import { assertStudentCanBookClassProgramme } from "@/lib/admin-programmes.server";
import { clubBookingPath } from "@/lib/clubs.shared";
import { getClubSlugById } from "@/lib/clubs.server";
import { assertActiveMembershipForBooking } from "@/lib/membership-access.server";
import { resolveStudentBookingCancellation } from "@/lib/student-portal-booking-cancel.shared";
import {
  legacyStudentPortalPath,
  studentPortalPath,
} from "@/lib/student-portal-routing.shared";
import {
  assertClassSessionHasSpaceForBooking,
  cancelActiveSessionWaitlistForUserIfPresent,
  createNextWaitlistOfferAfterCancellation,
} from "@/lib/session-waitlist.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type MemberBookingOutcome = "confirmed";

export interface MemberBookingResult {
  outcome: MemberBookingOutcome;
  className: string;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
}

const ALREADY_BOOKED_MESSAGE = "You are already booked onto this class.";

interface ClassSessionRow {
  id: string;
  class_id: string;
  club_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
  source: string | null;
  external_id: string | null;
}

interface SessionAttendeeRow {
  id: string;
  booking_status: string | null;
  attendance_status: string | null;
}

export interface BookClassSessionForUserInput {
  userId: string;
  classSessionId: string;
  clubId?: string;
}

async function getClassSession(classSessionId: string) {
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

  return data as ClassSessionRow;
}

async function getClassName(classId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("name")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class details: ${error.message}`);
  }

  return data?.name ?? "Unnamed class";
}

async function getBookedCount(classSessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: true })
    .eq("class_session_id", classSessionId)
    .eq("booking_status", "booked");

  if (error) {
    throw new Error(`Unable to count bookings: ${error.message}`);
  }

  return count ?? 0;
}

async function getExistingMemberBooking(classSessionId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, booking_status, attendance_status")
    .eq("class_session_id", classSessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load booking: ${error.message}`);
  }

  return data as SessionAttendeeRow | null;
}

async function getBookingSessionLocation(
  classSessionId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("source, external_id")
    .eq("id", classSessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return resolveSessionLocationFromRow({
    source: data.source,
    external_id: data.external_id,
  });
}

function buildMemberBookingResult(
  outcome: MemberBookingOutcome,
  className: string,
  classSession: ClassSessionRow,
  location: string | null,
): MemberBookingResult {
  const { dateLabel, timeLabel } = buildSessionDisplayLabels({
    startsAt: classSession.starts_at,
    endsAt: classSession.ends_at,
    externalId: classSession.external_id,
  });

  return {
    outcome,
    className,
    dateLabel,
    timeLabel,
    location,
  };
}

async function createMemberSessionAttendee(
  classSessionId: string,
  userId: string,
  existingBooking: SessionAttendeeRow | null,
) {
  const supabase = getSupabaseAdminClient();

  if (existingBooking) {
    const { error: updateError } = await supabase
      .from("session_attendees")
      .update({
        booking_status: "booked",
        attendance_status: "not_marked",
        source: "student_booking",
        booked_at: new Date().toISOString(),
      })
      .eq("id", existingBooking.id);

    if (updateError) {
      throw new Error(`Unable to complete booking: ${updateError.message}`);
    }

    return;
  }

  const { error } = await supabase.from("session_attendees").insert({
    class_session_id: classSessionId,
    user_id: userId,
    booking_status: "booked",
    attendance_status: "not_marked",
    source: "student_booking",
    booked_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to complete booking: ${error.message}`);
  }
}

export async function revalidatePathsAfterMemberBooking(input?: {
  portalUserId?: string;
  clubId?: string;
  additionalPortalUserIds?: string[];
}) {
  const portalUserId = input?.portalUserId;
  const clubId = input?.clubId;
  const additionalPortalUserIds = input?.additionalPortalUserIds ?? [];

  revalidatePath("/book");

  if (clubId) {
    const clubSlug = await getClubSlugById(clubId);

    if (clubSlug) {
      revalidatePath(clubBookingPath(clubSlug));
    }
  }

  revalidatePath("/attendance");

  const portalUserIds = Array.from(
    new Set(
      [portalUserId, ...additionalPortalUserIds].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );

  for (const userId of portalUserIds) {
    revalidatePath(legacyStudentPortalPath(userId));
    revalidatePath(legacyStudentPortalPath(userId, "book"));
    revalidatePath(legacyStudentPortalPath(userId, "bookings"));

    if (clubId) {
      const clubSlug = (await getClubSlugById(clubId)) ?? undefined;

      if (clubSlug) {
        revalidatePath(studentPortalPath(clubSlug, userId));
        revalidatePath(studentPortalPath(clubSlug, userId, "book"));
        revalidatePath(studentPortalPath(clubSlug, userId, "bookings"));
        revalidatePath(studentPortalPath(clubSlug, userId, "messages"));
      }
    }
  }
}

export async function getClassSessionClubId(classSessionId: string) {
  const session = await getClassSession(classSessionId);
  return session.club_id;
}

export async function bookClassSessionForUser(
  input: BookClassSessionForUserInput,
): Promise<MemberBookingResult> {
  const userId = input.userId.trim();
  const classSessionId = input.classSessionId.trim();

  if (!userId) {
    throw new Error("Student account is required.");
  }

  if (!classSessionId) {
    throw new Error("Please choose a class to book.");
  }

  const classSession = await getClassSession(classSessionId);

  if (input.clubId && classSession.club_id !== input.clubId) {
    throw new Error("This class is not available for your club.");
  }

  const clubId = input.clubId ?? classSession.club_id;
  await assertSessionIsBookableForClub(classSessionId, clubId);

  const membershipAccess = await assertActiveMembershipForBooking(userId, clubId);

  if (!membershipAccess.allowed) {
    throw new Error(membershipAccess.message);
  }

  await assertStudentCanBookClassProgramme({
    userId,
    clubId,
    classId: classSession.class_id,
  });

  const [className, location, existingBooking] = await Promise.all([
    getClassName(classSession.class_id),
    getBookingSessionLocation(classSessionId),
    getExistingMemberBooking(classSessionId, userId),
  ]);

  if (existingBooking?.booking_status === "booked") {
    throw new Error(ALREADY_BOOKED_MESSAGE);
  }

  if (existingBooking?.booking_status === "waitlisted") {
    throw new Error(
      "You are on the legacy waiting list for this class. Leave the waitlist or contact your academy.",
    );
  }

  await assertClassSessionHasSpaceForBooking(classSessionId, classSession.capacity);

  await createMemberSessionAttendee(classSessionId, userId, existingBooking);
  await cancelActiveSessionWaitlistForUserIfPresent(classSessionId, userId);

  await revalidatePathsAfterMemberBooking({
    portalUserId: userId,
    clubId: classSession.club_id,
  });

  return buildMemberBookingResult("confirmed", className, classSession, location);
}

function isActiveMemberBookingStatus(status: string | null | undefined) {
  return status === "booked";
}

export async function cancelClassSessionBookingForUser(
  input: BookClassSessionForUserInput,
): Promise<{ className: string }> {
  const userId = input.userId.trim();
  const classSessionId = input.classSessionId.trim();

  if (!userId) {
    throw new Error("Student account is required.");
  }

  if (!classSessionId) {
    throw new Error("Please choose a class to cancel.");
  }

  const classSession = await getClassSession(classSessionId);

  if (input.clubId && classSession.club_id !== input.clubId) {
    throw new Error("This class is not available for your club.");
  }

  if (classSession.status === "cancelled") {
    throw new Error("This class session is no longer available.");
  }

  const existingBooking = await getExistingMemberBooking(classSessionId, userId);

  if (!existingBooking || !isActiveMemberBookingStatus(existingBooking.booking_status)) {
    throw new Error("No active booking found for this class.");
  }

  const cancellation = resolveStudentBookingCancellation({
    sessionStartsAt: classSession.starts_at,
    sessionEndsAt: classSession.ends_at,
    attendanceStatus: existingBooking.attendance_status,
  });

  if (!cancellation.canCancelBooking) {
    if (cancellation.cancelBlockedReason === "past_booking") {
      throw new Error("Past booking");
    }

    if (cancellation.cancelBlockedReason === "session_started") {
      throw new Error("This class has already started.");
    }

    if (cancellation.cancelBlockedReason === "attendance_recorded") {
      throw new Error("Attendance has already been recorded.");
    }

    throw new Error("This booking cannot be cancelled.");
  }

  const supabase = getSupabaseAdminClient();
  const { error: updateError } = await supabase
    .from("session_attendees")
    .update({
      booking_status: "cancelled",
      attendance_status: "not_marked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingBooking.id)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Unable to cancel booking: ${updateError.message}`);
  }

  const className = await getClassName(classSession.class_id);

  const offer = await createNextWaitlistOfferAfterCancellation({
    sessionId: classSessionId,
    clubId: classSession.club_id,
    cancelledAttendeeId: existingBooking.id,
  });

  await revalidatePathsAfterMemberBooking({
    portalUserId: userId,
    clubId: classSession.club_id,
    additionalPortalUserIds: offer.offeredUserId ? [offer.offeredUserId] : [],
  });

  return { className };
}
