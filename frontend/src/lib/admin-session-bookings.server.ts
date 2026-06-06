import "server-only";

import { ACTIVE_CLUB_ID } from "@/lib/branding";
import type { ProgrammeType } from "@/lib/admin-programme-types";
import { getRecurringClassScheduleById } from "@/lib/admin-recurring-classes.server";
import { assertStudentEligibleForAdminProgrammeBooking, loadEligibleBookingStudentUserIds } from "@/lib/admin-programmes.server";
import { RECURRING_CLASS_SESSION_DAYS_AHEAD } from "@/lib/admin-recurring-classes.shared";
import {
  formatScheduleDayLabel,
  formatScheduleTimeRange,
  resolveSessionLocationFromRow,
  resolveSessionSlotTimeFromRow,
} from "@/lib/class-session-schedule";
import { compareAttendanceRegisterNames, getStudentFullName, sortByAttendanceRegisterName } from "@/lib/attendance";
import {
  getAttendanceRecordContext,
  syncAttendanceRecordForStatus,
} from "@/lib/attendance-records-sync";
import { formatSessionLocation, getSpacesAvailable } from "@/lib/booking";
import { createNextWaitlistOfferAfterCancellation } from "@/lib/session-waitlist.server";
import {
  daysBetweenLondonDateKeys,
  getLondonTodayDateKey,
  londonLocalDateTimeToUtcIso,
} from "@/lib/london-datetime";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRecurringBlockBookingMaxEndDate,
  getCancellableRecurringStudentBookings,
  isValidRecurringBookingUserId,
  normalizeRecurringBookingSessionStartsAt,
  sanitizeRecurringScheduleBookingsPageData,
  RECURRING_BLOCK_BOOKING_MAX_WEEKS,
  RECURRING_BLOCK_BOOKING_SESSION_COUNT,
  type AdminSessionBookingsView,
  type BlockBookingResult,
  type BookingStudentOption,
  type CancelRecurringBookingResult,
  type RecurringScheduleBookingsPageData,
  type RecurringScheduleSessionHealth,
  type RecurringScheduleStudentBookingSummary,
  type SessionBookingAttendee,
} from "@/lib/admin-session-bookings.shared";

export type {
  AdminSessionBookingsView,
  BlockBookingResult,
  BookingStudentOption,
  CancelRecurringBookingResult,
  RecurringScheduleBookingsPageData,
  RecurringScheduleSessionHealth,
  RecurringScheduleStudentBookingSummary,
  SessionBookingAttendee,
};

interface RecurringScheduleRow {
  id: string;
  club_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  location: string | null;
  is_active: boolean;
}

interface FutureSessionRow {
  id: string;
  capacity: number | null;
  status: string | null;
  starts_at: string;
  recurring_schedule_id: string | null;
  external_id: string | null;
  source: string | null;
}

const LONDON_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getLondonDayOfWeek(startsAt: string) {
  const dayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London",
    weekday: "short",
  }).format(new Date(startsAt));

  return LONDON_DOW[dayLabel];
}

function normalizeScheduleTime(timeValue: string) {
  return timeValue.slice(0, 5);
}

function sessionMatchesRecurringSchedule(
  session: FutureSessionRow,
  schedule: RecurringScheduleRow,
) {
  if (session.recurring_schedule_id === schedule.id) {
    return true;
  }

  const dayOfWeek = getLondonDayOfWeek(session.starts_at);
  const slotTime = resolveSessionSlotTimeFromRow(session);
  const slotLocation = resolveSessionLocationFromRow(session);

  if (dayOfWeek === undefined) {
    return false;
  }

  if (dayOfWeek !== schedule.day_of_week) {
    return false;
  }

  if (slotTime !== normalizeScheduleTime(schedule.start_time)) {
    return false;
  }

  if (schedule.location && slotLocation) {
    return schedule.location === slotLocation;
  }

  return true;
}

async function loadFutureSessionsForRecurringSchedule(
  schedule: RecurringScheduleRow,
  endIso: string,
) {
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, capacity, status, starts_at, recurring_schedule_id, external_id, source")
    .eq("club_id", schedule.club_id)
    .eq("class_id", schedule.class_id)
    .gte("starts_at", nowIso)
    .lte("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to load recurring sessions: ${error.message}`);
  }

  const matched = ((data ?? []) as FutureSessionRow[]).filter((session) =>
    sessionMatchesRecurringSchedule(session, schedule),
  );

  return Array.from(new Map(matched.map((session) => [session.id, session])).values());
}

function getFarFutureEndIso() {
  const end = new Date();
  end.setFullYear(end.getFullYear() + 2);
  return end.toISOString();
}

async function loadAllFutureSessionsForRecurringSchedule(
  schedule: RecurringScheduleRow,
) {
  return loadFutureSessionsForRecurringSchedule(schedule, getFarFutureEndIso());
}

function isActiveBookingStatus(status: string | null | undefined) {
  return (
    status === "booked" || status === "waitlisted" || status === "walk_in"
  );
}

async function loadScheduleLinkedFutureSessions(
  schedule: RecurringScheduleRow,
  sessionCount?: number,
) {
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("class_sessions")
    .select(
      "id, capacity, status, starts_at, recurring_schedule_id, external_id, source",
    )
    .eq("recurring_schedule_id", schedule.id)
    .gte("starts_at", nowIso)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });

  if (sessionCount !== undefined) {
    query = query.limit(sessionCount);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load schedule-linked sessions: ${error.message}`);
  }

  return (data ?? []) as FutureSessionRow[];
}

async function getCanonicalBlockBookingSessions(
  schedule: RecurringScheduleRow,
  sessionCount: number = RECURRING_BLOCK_BOOKING_SESSION_COUNT,
) {
  const linkedSessions = await loadScheduleLinkedFutureSessions(
    schedule,
    sessionCount,
  );

  if (linkedSessions.length >= sessionCount) {
    return linkedSessions.slice(0, sessionCount);
  }

  const sessions = await loadAllFutureSessionsForRecurringSchedule(schedule);

  return sessions
    .filter((session) => session.status !== "cancelled")
    .slice(0, sessionCount);
}

interface EnsureRecurringSessionsResult {
  sessions: FutureSessionRow[];
  futureSessionCount: number;
  requiredSessionCount: number;
  generationError: string | null;
}

async function tryEnsureRecurringScheduleFutureSessions(
  scheduleId: string,
  clubId: string,
  sessionCount: number = RECURRING_BLOCK_BOOKING_SESSION_COUNT,
): Promise<EnsureRecurringSessionsResult> {
  const supabase = getSupabaseAdminClient();
  const schedule = await loadRecurringScheduleRow(scheduleId, clubId);
  let canonicalSessions = await getCanonicalBlockBookingSessions(
    schedule,
    sessionCount,
  );

  if (canonicalSessions.length >= sessionCount) {
    return {
      sessions: canonicalSessions,
      futureSessionCount: canonicalSessions.length,
      requiredSessionCount: sessionCount,
      generationError: null,
    };
  }

  let daysAhead = RECURRING_CLASS_SESSION_DAYS_AHEAD;
  let generationError: string | null = null;

  while (canonicalSessions.length < sessionCount && daysAhead <= 420) {
    const { error } = await supabase.rpc("generate_recurring_class_sessions", {
      p_schedule_id: scheduleId,
      p_days_ahead: daysAhead,
    });

    if (error) {
      generationError = `Unable to generate recurring sessions: ${error.message}`;
      break;
    }

    canonicalSessions = await getCanonicalBlockBookingSessions(
      schedule,
      sessionCount,
    );
    daysAhead += 56;
  }

  if (canonicalSessions.length < sessionCount && !generationError) {
    generationError = `Only ${canonicalSessions.length} non-cancelled future sessions are scheduled; ${sessionCount} are expected for full-year block booking.`;
  }

  return {
    sessions: canonicalSessions,
    futureSessionCount: canonicalSessions.length,
    requiredSessionCount: sessionCount,
    generationError,
  };
}

function buildRecurringScheduleSessionHealth(
  scheduleIsActive: boolean,
  result: EnsureRecurringSessionsResult,
  listedFutureSessionCount: number,
): RecurringScheduleSessionHealth {
  const futureSessionCount = Math.max(
    listedFutureSessionCount,
    result.futureSessionCount,
  );

  return {
    futureSessionCount,
    requiredSessionCount: result.requiredSessionCount,
    canBlockBook: scheduleIsActive && futureSessionCount > 0,
    warning: result.generationError,
  };
}

function parseBlockBookingEndDate(endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("End date must use YYYY-MM-DD format.");
  }

  const maxEndDate = getRecurringBlockBookingMaxEndDate();

  if (endDate > maxEndDate) {
    throw new Error(
      `End date cannot be more than ${RECURRING_BLOCK_BOOKING_MAX_WEEKS} weeks ahead (maximum ${maxEndDate}).`,
    );
  }

  const today = getLondonTodayDateKey();

  if (endDate < today) {
    throw new Error("End date must be today or later.");
  }

  return endDate;
}

async function ensureRecurringScheduleSessionsThroughDate(
  scheduleId: string,
  clubId: string,
  endDate: string,
) {
  const supabase = getSupabaseAdminClient();
  const schedule = await loadRecurringScheduleRow(scheduleId, clubId);
  const endIso = londonLocalDateTimeToUtcIso(endDate, "23:59");
  const todayKey = getLondonTodayDateKey();
  const daysAhead = Math.min(
    Math.max(1, daysBetweenLondonDateKeys(todayKey, endDate)),
    RECURRING_CLASS_SESSION_DAYS_AHEAD,
  );

  const { error } = await supabase.rpc("generate_recurring_class_sessions", {
    p_schedule_id: scheduleId,
    p_days_ahead: daysAhead,
  });

  const sessions = await loadFutureSessionsForRecurringSchedule(schedule, endIso);

  if (sessions.length === 0) {
    if (error) {
      throw new Error(
        `No future sessions are scheduled for this class. Session generation failed: ${error.message}`,
      );
    }

    throw new Error(
      "No future sessions are scheduled for this class through the selected date.",
    );
  }

  return sessions;
}

async function loadRecurringScheduleRow(
  scheduleId: string,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const supabase = getSupabaseAdminClient();

  const { data: schedule, error: scheduleError } = await supabase
    .from("recurring_class_schedules")
    .select("id, club_id, class_id, day_of_week, start_time, location, is_active")
    .eq("id", scheduleId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (scheduleError) {
    throw new Error(`Unable to load recurring schedule: ${scheduleError.message}`);
  }

  if (!schedule) {
    throw new Error("Recurring class schedule not found.");
  }

  return schedule as RecurringScheduleRow;
}

function buildAdminBookingPayload(bookingStatus: "booked" | "waitlisted") {
  return {
    booking_status: bookingStatus,
    attendance_status: "not_marked" as const,
    source: "student_booking",
    booked_at: new Date().toISOString(),
  };
}

interface SessionAttendeeQueryRow {
  id: string;
  user_id: string;
  booking_status: string | null;
  attendance_status: string | null;
  booked_at: string | null;
}

interface BookingUserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ClassSessionQueryRow {
  id: string;
  class_id: string;
  club_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: string | null;
  source: string | null;
  external_id: string | null;
  recurring_schedule_id: string | null;
  classes:
    | {
        id: string;
        name: string;
        programme_type: ProgrammeType;
      }
    | {
        id: string;
        name: string;
        programme_type: ProgrammeType;
      }[]
    | null;
}

function getJoinedClass(classes: ClassSessionQueryRow["classes"]) {
  if (!classes) {
    return null;
  }

  return Array.isArray(classes) ? classes[0] ?? null : classes;
}

async function loadUsersByIds(userIds: string[]): Promise<Map<string, BookingUserRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  if (error) {
    throw new Error(`Unable to load users: ${error.message}`);
  }

  return new Map(((data ?? []) as BookingUserRow[]).map((user) => [user.id, user]));
}

function mapAttendeeRow(
  row: SessionAttendeeQueryRow,
  userById: Map<string, BookingUserRow>,
): SessionBookingAttendee {
  const user = userById.get(row.user_id);

  return {
    id: row.id,
    userId: row.user_id,
    firstName: user?.first_name ?? null,
    lastName: user?.last_name ?? null,
    email: user?.email ?? null,
    bookingStatus: row.booking_status ?? "booked",
    attendanceStatus: row.attendance_status,
    bookedAt: row.booked_at,
  };
}

async function getClassSessionRow(
  sessionId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<ClassSessionQueryRow> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, club_id, starts_at, ends_at, capacity, status, source, external_id, recurring_schedule_id, classes(id, name, programme_type)",
    )
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load class session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Class session not found.");
  }

  return data as ClassSessionQueryRow;
}

async function getBookingCounts(sessionId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("session_attendees")
    .select("booking_status")
    .eq("class_session_id", sessionId)
    .in("booking_status", ["booked", "waitlisted", "walk_in"]);

  if (error) {
    throw new Error(`Unable to load booking counts: ${error.message}`);
  }

  let bookedCount = 0;
  let waitlistCount = 0;

  for (const row of data ?? []) {
    if (row.booking_status === "waitlisted") {
      waitlistCount += 1;
    } else {
      bookedCount += 1;
    }
  }

  return { bookedCount, waitlistCount };
}

export async function getAdminSessionBookingsPageData(
  sessionId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<AdminSessionBookingsView> {
  const supabase = getSupabaseAdminClient();
  const sessionRow = await getClassSessionRow(sessionId, clubId);
  const classRow = getJoinedClass(sessionRow.classes);
  const location = resolveSessionLocationFromRow(sessionRow);

  const [{ data: attendeeRows, error: attendeesError }, counts] = await Promise.all([
    supabase
      .from("session_attendees")
      .select("id, user_id, booking_status, attendance_status, booked_at")
      .eq("class_session_id", sessionId)
      .in("booking_status", ["booked", "waitlisted", "walk_in"]),
    getBookingCounts(sessionId),
  ]);

  if (attendeesError) {
    throw new Error(`Unable to load session bookings: ${attendeesError.message}`);
  }

  const attendeeList = (attendeeRows ?? []) as SessionAttendeeQueryRow[];
  const userIds = Array.from(new Set(attendeeList.map((row) => row.user_id)));
  const userById = await loadUsersByIds(userIds);
  const attendees = sortByAttendanceRegisterName(
    attendeeList.map((row) => mapAttendeeRow(row, userById)),
    (attendee) => ({
      firstName: attendee.firstName,
      lastName: attendee.lastName,
    }),
  );
  const status = sessionRow.status;
  const isCancelled = status === "cancelled";

  return {
    session: {
      id: sessionRow.id,
      className: classRow?.name ?? "Unnamed class",
      programmeType: classRow?.programme_type ?? "bjj",
      startsAt: sessionRow.starts_at,
      endsAt: sessionRow.ends_at,
      location,
      capacity: sessionRow.capacity,
      bookedCount: counts.bookedCount,
      waitlistCount: counts.waitlistCount,
      spacesAvailable: getSpacesAvailable(sessionRow.capacity, counts.bookedCount),
      status,
      isCancelled,
      dateLabel: formatScheduleDayLabel(sessionRow.starts_at),
      timeLabel: formatScheduleTimeRange(
        sessionRow.starts_at,
        sessionRow.ends_at,
        sessionRow.external_id,
      ),
      locationLabel: formatSessionLocation(location),
      recurringScheduleId: sessionRow.recurring_schedule_id,
    },
    attendees,
  };
}

export async function getBookingStudentOptions(
  clubId: string = ACTIVE_CLUB_ID,
  options?: { programmeType?: ProgrammeType },
): Promise<BookingStudentOption[]> {
  const userIds = await loadEligibleBookingStudentUserIds(clubId, options);

  if (userIds.length === 0) {
    return [];
  }

  const userById = await loadUsersByIds(userIds);
  const students = userIds
    .map((userId) => userById.get(userId))
    .filter((user): user is BookingUserRow => Boolean(user));

  students.sort((left, right) =>
    compareAttendanceRegisterNames(
      left.first_name,
      left.last_name,
      right.first_name,
      right.last_name,
    ),
  );

  return students.map((user) => ({
    id: user.id,
    label: getStudentFullName(user.first_name, user.last_name),
    email: user.email,
  }));
}

async function assertClubMember(userId: string, clubId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to verify membership: ${error.message}`);
  }

  if (!data) {
    throw new Error("Selected student is not a club member.");
  }
}

async function getExistingAttendee(classSessionId: string, userId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, booking_status, attendance_status")
    .eq("class_session_id", classSessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load existing booking: ${error.message}`);
  }

  return data as {
    id: string;
    booking_status: string | null;
    attendance_status: string | null;
  } | null;
}

async function getBookedCountForSession(classSessionId: string) {
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

export interface AdminAddSessionBookingOptions {
  allowWaitlist?: boolean;
}

export async function adminAddSessionBooking(
  sessionId: string,
  userId: string,
  options: AdminAddSessionBookingOptions = {},
  clubId: string = ACTIVE_CLUB_ID,
) {
  const sessionRow = await getClassSessionRow(sessionId, clubId);

  if (sessionRow.status === "cancelled") {
    throw new Error("Cannot book students onto a cancelled session.");
  }

  await assertClubMember(userId, sessionRow.club_id);
  const classRow = getJoinedClass(sessionRow.classes);
  await assertStudentEligibleForAdminProgrammeBooking(
    userId,
    sessionRow.club_id,
    classRow?.programme_type ?? "bjj",
  );

  const existing = await getExistingAttendee(sessionId, userId);

  if (
    existing?.booking_status === "booked" ||
    existing?.booking_status === "waitlisted" ||
    existing?.booking_status === "walk_in"
  ) {
    throw new Error("Student is already booked or waitlisted for this session.");
  }

  const bookedCount = await getBookedCountForSession(sessionId);
  const hasSpace =
    sessionRow.capacity === null || bookedCount < sessionRow.capacity;

  let bookingStatus: "booked" | "waitlisted";

  if (hasSpace) {
    bookingStatus = "booked";
  } else if (options.allowWaitlist) {
    bookingStatus = "waitlisted";
  } else {
    throw new Error(
      `Class is full (${bookedCount}/${sessionRow.capacity ?? "∞"}). Enable waitlist to add anyway.`,
    );
  }

  const supabase = getSupabaseAdminClient();
  const payload = buildAdminBookingPayload(bookingStatus);

  if (existing) {
    const { error } = await supabase
      .from("session_attendees")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Unable to add booking: ${error.message}`);
    }

    return { bookingStatus };
  }

  const { error } = await supabase.from("session_attendees").insert({
    class_session_id: sessionId,
    user_id: userId,
    ...payload,
  });

  if (error) {
    throw new Error(`Unable to add booking: ${error.message}`);
  }

  return { bookingStatus };
}

export async function adminCancelSessionBooking(attendeeId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, booking_status, attendance_status, class_session_id")
    .eq("id", attendeeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load booking: ${error.message}`);
  }

  if (!data) {
    throw new Error("Booking not found.");
  }

  if (data.booking_status === "cancelled") {
    return;
  }

  if (
    data.attendance_status === "present" ||
    data.attendance_status === "absent"
  ) {
    const context = await getAttendanceRecordContext(supabase, attendeeId);
    await syncAttendanceRecordForStatus(supabase, context, "not_marked");
  }

  const { error: updateError } = await supabase
    .from("session_attendees")
    .update({
      booking_status: "cancelled",
      attendance_status: "not_marked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", attendeeId);

  if (updateError) {
    throw new Error(`Unable to cancel booking: ${updateError.message}`);
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("class_sessions")
    .select("club_id")
    .eq("id", data.class_session_id)
    .maybeSingle();

  if (sessionError) {
    throw new Error(`Unable to load class session: ${sessionError.message}`);
  }

  if (sessionRow?.club_id) {
    await createNextWaitlistOfferAfterCancellation({
      sessionId: data.class_session_id,
      clubId: sessionRow.club_id,
      cancelledAttendeeId: attendeeId,
    });
  }
}

export async function getRecurringScheduleBookedStudentOptions(
  scheduleId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<BookingStudentOption[]> {
  const schedule = await loadRecurringScheduleRow(scheduleId, clubId);
  const sessions = await loadAllFutureSessionsForRecurringSchedule(schedule);
  const sessionIds = sessions.map((session) => session.id);

  if (sessionIds.length === 0) {
    return [];
  }

  const attendeeRows = (await fetchAllFutureSessionAttendees(sessionIds, [
    "booked",
    "waitlisted",
    "walk_in",
  ])).filter((row) => isValidRecurringBookingUserId(row.user_id));

  const userIds = Array.from(
    new Set(
      attendeeRows
        .map((row) => row.user_id)
        .filter(isValidRecurringBookingUserId),
    ),
  );

  if (userIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  if (usersError) {
    throw new Error(`Unable to load booked students: ${usersError.message}`);
  }

  const sortedUsers = sortByAttendanceRegisterName(
    (users ?? []) as BookingUserRow[],
    (user) => ({
      firstName: user.first_name,
      lastName: user.last_name,
    }),
  );

  return sortedUsers.map((user) => ({
    id: user.id,
    label: getStudentFullName(user.first_name, user.last_name),
    email: user.email,
  }));
}

interface FutureSessionAttendeeRow {
  id: string;
  user_id: string | null;
  booking_status: string | null;
  class_session_id: string;
}

function buildRecurringScheduleStudentBookingSummaries(input: {
  attendees: FutureSessionAttendeeRow[];
  userById: Map<string, BookingUserRow>;
  canonicalSessionIdSet: Set<string>;
  sessionStartsAtById: Map<string, string>;
}): RecurringScheduleStudentBookingSummary[] {
  const summaryByUserId = new Map<string, RecurringScheduleStudentBookingSummary>();

  for (const attendee of input.attendees) {
    if (!isValidRecurringBookingUserId(attendee.user_id)) {
      continue;
    }

    const userId = attendee.user_id;
    const user = input.userById.get(userId);
    const inCanonicalWindow = input.canonicalSessionIdSet.has(attendee.class_session_id);
    const rawStartsAt = inCanonicalWindow
      ? (input.sessionStartsAtById.get(attendee.class_session_id) ?? null)
      : null;
    const startsAt = normalizeRecurringBookingSessionStartsAt(rawStartsAt);
    const existing = summaryByUserId.get(userId);

    if (!existing) {
      summaryByUserId.set(userId, {
        userId,
        firstName: user?.first_name ?? null,
        lastName: user?.last_name ?? null,
        email: user?.email ?? null,
        futureBookingCount:
          inCanonicalWindow && attendee.booking_status === "booked" ? 1 : 0,
        nextSessionAt: startsAt,
        bookedCount:
          inCanonicalWindow && attendee.booking_status === "booked" ? 1 : 0,
        waitlistedCount:
          inCanonicalWindow && attendee.booking_status === "waitlisted" ? 1 : 0,
        walkInCount:
          inCanonicalWindow && attendee.booking_status === "walk_in" ? 1 : 0,
      });
      continue;
    }

    if (!inCanonicalWindow) {
      continue;
    }

    if (attendee.booking_status === "booked") {
      existing.futureBookingCount += 1;
      existing.bookedCount += 1;
    } else if (attendee.booking_status === "waitlisted") {
      existing.waitlistedCount += 1;
    } else if (attendee.booking_status === "walk_in") {
      existing.walkInCount += 1;
    }

    if (
      startsAt &&
      (!existing.nextSessionAt || startsAt < existing.nextSessionAt)
    ) {
      existing.nextSessionAt = startsAt;
    }
  }

  return sortByAttendanceRegisterName(
    Array.from(summaryByUserId.values()),
    (booking) => ({
      firstName: booking.firstName,
      lastName: booking.lastName,
    }),
  );
}

const SUPABASE_PAGE_SIZE = 1000;

async function fetchAllFutureSessionAttendees(
  sessionIds: string[],
  bookingStatuses: string[],
): Promise<FutureSessionAttendeeRow[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const rows: FutureSessionAttendeeRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("session_attendees")
      .select("id, user_id, booking_status, class_session_id")
      .in("class_session_id", sessionIds)
      .in("booking_status", bookingStatuses)
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Unable to load recurring bookings: ${error.message}`);
    }

    const page = (data ?? []) as FutureSessionAttendeeRow[];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return rows;
}

export async function getRecurringScheduleBookingsPageData(
  scheduleId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<RecurringScheduleBookingsPageData> {
  const scheduleRow = await getRecurringClassScheduleById(scheduleId, clubId);

  if (!scheduleRow) {
    throw new Error("Recurring class schedule not found.");
  }

  const schedule = await loadRecurringScheduleRow(scheduleId, clubId);
  const scheduleLinkedSessions = await loadScheduleLinkedFutureSessions(schedule);
  const allFutureSessions =
    scheduleLinkedSessions.length > 0
      ? scheduleLinkedSessions
      : await loadAllFutureSessionsForRecurringSchedule(schedule);
  const allFutureSessionIds = allFutureSessions.map((session) => session.id);
  const sessionEnsureResult = await tryEnsureRecurringScheduleFutureSessions(
    scheduleId,
    clubId,
  );
  const canonicalSessions =
    sessionEnsureResult.sessions.length > 0
      ? sessionEnsureResult.sessions
      : await getCanonicalBlockBookingSessions(schedule);
  const canonicalSessionIdSet = new Set(
    canonicalSessions.map((session) => session.id),
  );
  const sessionStartsAtById = new Map(
    canonicalSessions.map((session) => [session.id, session.starts_at]),
  );

  const studentBookings: RecurringScheduleStudentBookingSummary[] = [];

  if (allFutureSessionIds.length > 0) {
    const attendees = (await fetchAllFutureSessionAttendees(allFutureSessionIds, [
      "booked",
      "waitlisted",
      "walk_in",
    ])).filter((row) => isValidRecurringBookingUserId(row.user_id));
    const userIds = Array.from(
      new Set(
        attendees
          .map((row) => row.user_id)
          .filter(isValidRecurringBookingUserId),
      ),
    );

    const userById = await loadUsersByIds(userIds);

    studentBookings.push(
      ...buildRecurringScheduleStudentBookingSummaries({
        attendees,
        userById,
        canonicalSessionIdSet,
        sessionStartsAtById,
      }),
    );
  }

  const cancellableStudentBookings =
    getCancellableRecurringStudentBookings(studentBookings);

  return sanitizeRecurringScheduleBookingsPageData({
    schedule: {
      id: scheduleRow.id,
      className: scheduleRow.className,
      programmeType: scheduleRow.programmeType,
      dayOfWeek: scheduleRow.dayOfWeek,
      startTime: scheduleRow.startTime,
      endTime: scheduleRow.endTime,
      capacity: scheduleRow.capacity,
      location: scheduleRow.location,
      isActive: scheduleRow.isActive,
    },
    studentBookings,
    cancellableStudentBookings,
    sessionHealth: buildRecurringScheduleSessionHealth(
      scheduleRow.isActive,
      sessionEnsureResult,
      allFutureSessions.length,
    ),
  });
}

export async function adminCancelRecurringScheduleBookings(input: {
  scheduleId: string;
  userId: string;
  clubId?: string;
}): Promise<CancelRecurringBookingResult> {
  const clubId = input.clubId ?? ACTIVE_CLUB_ID;
  const schedule = await loadRecurringScheduleRow(input.scheduleId, clubId);
  await assertClubMember(input.userId, schedule.club_id);

  const sessions = await loadAllFutureSessionsForRecurringSchedule(schedule);
  let removedCount = 0;

  for (const session of sessions) {
    const existing = await getExistingAttendee(session.id, input.userId);

    if (
      existing?.booking_status !== "booked" &&
      existing?.booking_status !== "waitlisted" &&
      existing?.booking_status !== "walk_in"
    ) {
      continue;
    }

    await adminCancelSessionBooking(existing.id);
    removedCount += 1;
  }

  return { removedCount };
}

export async function adminBlockBookRecurringSchedule(input: {
  scheduleId: string;
  userId: string;
  endDate: string;
  clubId?: string;
}): Promise<BlockBookingResult> {
  const endDate = parseBlockBookingEndDate(input.endDate);
  const supabase = getSupabaseAdminClient();
  const clubId = input.clubId ?? ACTIVE_CLUB_ID;
  const schedule = await loadRecurringScheduleRow(input.scheduleId, clubId);
  const scheduleMeta = await getRecurringClassScheduleById(input.scheduleId, clubId);

  if (!scheduleMeta) {
    throw new Error("Recurring class schedule not found.");
  }

  await assertClubMember(input.userId, schedule.club_id);
  await assertStudentEligibleForAdminProgrammeBooking(
    input.userId,
    clubId,
    scheduleMeta.programmeType,
  );

  const sessions = await ensureRecurringScheduleSessionsThroughDate(
    input.scheduleId,
    clubId,
    endDate,
  );

  const result: BlockBookingResult = {
    bookedCount: 0,
    trimmedCount: 0,
    skipped: {
      cancelled: 0,
      alreadyBooked: 0,
      full: 0,
    },
  };

  for (const session of sessions) {
    if (session.status === "cancelled") {
      result.skipped.cancelled += 1;
      continue;
    }

    const existing = await getExistingAttendee(session.id, input.userId);

    if (isActiveBookingStatus(existing?.booking_status)) {
      if (existing?.booking_status === "booked") {
        result.skipped.alreadyBooked += 1;
      } else {
        const payload = buildAdminBookingPayload("booked");
        const { error } = await supabase
          .from("session_attendees")
          .update(payload)
          .eq("id", existing.id);

        if (error) {
          throw new Error(`Unable to block book session: ${error.message}`);
        }

        result.bookedCount += 1;
      }

      continue;
    }

    const bookedCount = await getBookedCountForSession(session.id);
    const hasSpace =
      session.capacity === null || bookedCount < session.capacity;

    if (!hasSpace) {
      result.skipped.full += 1;
      continue;
    }

    const payload = buildAdminBookingPayload("booked");

    if (existing) {
      const { error } = await supabase
        .from("session_attendees")
        .update(payload)
        .eq("id", existing.id);

      if (error) {
        throw new Error(`Unable to block book session: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from("session_attendees").insert({
        class_session_id: session.id,
        user_id: input.userId,
        ...payload,
      });

      if (error) {
        throw new Error(`Unable to block book session: ${error.message}`);
      }
    }

    result.bookedCount += 1;
  }

  return result;
}
