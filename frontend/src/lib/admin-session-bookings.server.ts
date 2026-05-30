import "server-only";

import { ACTIVE_CLUB_ID } from "@/lib/branding";
import type { ProgrammeType } from "@/lib/admin-programme-types";
import { getRecurringClassScheduleById } from "@/lib/admin-recurring-classes.server";
import {
  formatScheduleDayLabel,
  formatScheduleTimeRange,
  resolveSessionLocationFromRow,
  resolveSessionSlotTimeFromRow,
} from "@/lib/class-session-schedule";
import { getStudentFullName } from "@/lib/attendance";
import {
  getAttendanceRecordContext,
  syncAttendanceRecordForStatus,
} from "@/lib/attendance-records-sync";
import { formatSessionLocation, getSpacesAvailable } from "@/lib/booking";
import { londonLocalDateTimeToUtcIso } from "@/lib/london-datetime";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AdminSessionBookingsView,
  BlockBookingResult,
  BookingStudentOption,
  CancelRecurringBookingResult,
  RecurringScheduleBookingsPageData,
  RecurringScheduleStudentBookingSummary,
  SessionBookingAttendee,
} from "@/lib/admin-session-bookings.shared";

export type {
  AdminSessionBookingsView,
  BlockBookingResult,
  BookingStudentOption,
  CancelRecurringBookingResult,
  RecurringScheduleBookingsPageData,
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

async function loadRecurringScheduleRow(scheduleId: string) {
  const supabase = getSupabaseAdminClient();

  const { data: schedule, error: scheduleError } = await supabase
    .from("recurring_class_schedules")
    .select("id, club_id, class_id, day_of_week, start_time, location, is_active")
    .eq("id", scheduleId)
    .eq("club_id", ACTIVE_CLUB_ID)
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
  users:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }[]
    | null;
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

function getJoinedUser(users: SessionAttendeeQueryRow["users"]) {
  if (!users) {
    return null;
  }

  return Array.isArray(users) ? users[0] ?? null : users;
}

function getJoinedClass(classes: ClassSessionQueryRow["classes"]) {
  if (!classes) {
    return null;
  }

  return Array.isArray(classes) ? classes[0] ?? null : classes;
}

function mapAttendeeRow(row: SessionAttendeeQueryRow): SessionBookingAttendee {
  const user = getJoinedUser(row.users);

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

async function getClassSessionRow(sessionId: string): Promise<ClassSessionQueryRow> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, club_id, starts_at, ends_at, capacity, status, source, external_id, recurring_schedule_id, classes(id, name, programme_type)",
    )
    .eq("id", sessionId)
    .eq("club_id", ACTIVE_CLUB_ID)
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
): Promise<AdminSessionBookingsView> {
  const supabase = getSupabaseAdminClient();
  const sessionRow = await getClassSessionRow(sessionId);
  const classRow = getJoinedClass(sessionRow.classes);
  const location = resolveSessionLocationFromRow(sessionRow);

  const [{ data: attendeeRows, error: attendeesError }, counts] = await Promise.all([
    supabase
      .from("session_attendees")
      .select(
        "id, user_id, booking_status, attendance_status, booked_at, users(id, first_name, last_name, email)",
      )
      .eq("class_session_id", sessionId)
      .in("booking_status", ["booked", "waitlisted", "walk_in"])
      .order("booked_at", { ascending: true }),
    getBookingCounts(sessionId),
  ]);

  if (attendeesError) {
    throw new Error(`Unable to load session bookings: ${attendeesError.message}`);
  }

  const attendees = ((attendeeRows ?? []) as SessionAttendeeQueryRow[]).map(mapAttendeeRow);
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
      timeLabel: formatScheduleTimeRange(sessionRow.starts_at, sessionRow.ends_at),
      locationLabel: formatSessionLocation(location),
      recurringScheduleId: sessionRow.recurring_schedule_id,
    },
    attendees,
  };
}

export async function getBookingStudentOptions(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<BookingStudentOption[]> {
  const supabase = getSupabaseAdminClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", clubId);

  if (membershipsError) {
    throw new Error(`Unable to load club members: ${membershipsError.message}`);
  }

  const userIds = Array.from(
    new Set((memberships ?? []).map((membership) => membership.user_id)),
  );

  if (userIds.length === 0) {
    return [];
  }

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds)
    .order("last_name", { ascending: true });

  if (usersError) {
    throw new Error(`Unable to load students: ${usersError.message}`);
  }

  return (users ?? []).map((user) => ({
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
) {
  const sessionRow = await getClassSessionRow(sessionId);

  if (sessionRow.status === "cancelled") {
    throw new Error("Cannot book students onto a cancelled session.");
  }

  await assertClubMember(userId, sessionRow.club_id);

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
}

function parseEndDate(endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("End date must use YYYY-MM-DD format.");
  }

  return endDate;
}

export async function getRecurringScheduleBookedStudentOptions(
  scheduleId: string,
): Promise<BookingStudentOption[]> {
  const schedule = await loadRecurringScheduleRow(scheduleId);
  const sessions = await loadAllFutureSessionsForRecurringSchedule(schedule);
  const sessionIds = sessions.map((session) => session.id);

  if (sessionIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();

  const { data: attendeeRows, error } = await supabase
    .from("session_attendees")
    .select("user_id")
    .in("class_session_id", sessionIds)
    .in("booking_status", ["booked", "waitlisted", "walk_in"]);

  if (error) {
    throw new Error(`Unable to load booked students: ${error.message}`);
  }

  const userIds = Array.from(
    new Set((attendeeRows ?? []).map((row) => row.user_id)),
  );

  if (userIds.length === 0) {
    return [];
  }

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds)
    .order("last_name", { ascending: true });

  if (usersError) {
    throw new Error(`Unable to load booked students: ${usersError.message}`);
  }

  return (users ?? []).map((user) => ({
    id: user.id,
    label: getStudentFullName(user.first_name, user.last_name),
    email: user.email,
  }));
}

interface FutureSessionAttendeeRow {
  id: string;
  user_id: string;
  booking_status: string | null;
  class_session_id: string;
}

export async function getRecurringScheduleBookingsPageData(
  scheduleId: string,
): Promise<RecurringScheduleBookingsPageData> {
  const scheduleRow = await getRecurringClassScheduleById(scheduleId);

  if (!scheduleRow) {
    throw new Error("Recurring class schedule not found.");
  }

  const schedule = await loadRecurringScheduleRow(scheduleId);
  const sessions = await loadAllFutureSessionsForRecurringSchedule(schedule);
  const sessionIds = sessions.map((session) => session.id);
  const sessionStartsAtById = new Map(
    sessions.map((session) => [session.id, session.starts_at]),
  );

  const studentBookings: RecurringScheduleStudentBookingSummary[] = [];

  if (sessionIds.length > 0) {
    const supabase = getSupabaseAdminClient();

    const { data: attendeeRows, error } = await supabase
      .from("session_attendees")
      .select("id, user_id, booking_status, class_session_id")
      .in("class_session_id", sessionIds)
      .in("booking_status", ["booked", "waitlisted", "walk_in"]);

    if (error) {
      throw new Error(`Unable to load recurring bookings: ${error.message}`);
    }

    const attendees = (attendeeRows ?? []) as FutureSessionAttendeeRow[];
    const userIds = Array.from(new Set(attendees.map((row) => row.user_id)));

    const userById = new Map<
      string,
      {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    >();

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .in("id", userIds);

      if (usersError) {
        throw new Error(`Unable to load booked students: ${usersError.message}`);
      }

      for (const user of users ?? []) {
        userById.set(user.id, user);
      }
    }

    const summaryByUserId = new Map<string, RecurringScheduleStudentBookingSummary>();

    for (const attendee of attendees) {
      const user = userById.get(attendee.user_id);
      const startsAt = sessionStartsAtById.get(attendee.class_session_id) ?? null;
      const existing = summaryByUserId.get(attendee.user_id);

      if (!existing) {
        summaryByUserId.set(attendee.user_id, {
          userId: attendee.user_id,
          firstName: user?.first_name ?? null,
          lastName: user?.last_name ?? null,
          email: user?.email ?? null,
          futureBookingCount: 1,
          nextSessionAt: startsAt,
          bookedCount: attendee.booking_status === "booked" ? 1 : 0,
          waitlistedCount: attendee.booking_status === "waitlisted" ? 1 : 0,
          walkInCount: attendee.booking_status === "walk_in" ? 1 : 0,
        });
        continue;
      }

      existing.futureBookingCount += 1;

      if (attendee.booking_status === "booked") {
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

    studentBookings.push(
      ...Array.from(summaryByUserId.values()).sort((left, right) =>
        getStudentFullName(left.firstName, left.lastName).localeCompare(
          getStudentFullName(right.firstName, right.lastName),
          "en",
          { sensitivity: "base" },
        ),
      ),
    );
  }

  return {
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
  };
}

export async function adminCancelRecurringScheduleBookings(input: {
  scheduleId: string;
  userId: string;
}): Promise<CancelRecurringBookingResult> {
  const schedule = await loadRecurringScheduleRow(input.scheduleId);
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
}): Promise<BlockBookingResult> {
  const endDate = parseEndDate(input.endDate);
  const supabase = getSupabaseAdminClient();
  const schedule = await loadRecurringScheduleRow(input.scheduleId);

  await assertClubMember(input.userId, schedule.club_id);

  const endIso = londonLocalDateTimeToUtcIso(endDate, "23:59");
  const sessions = await loadFutureSessionsForRecurringSchedule(
    schedule as RecurringScheduleRow,
    endIso,
  );

  const result: BlockBookingResult = {
    bookedCount: 0,
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

    if (
      existing?.booking_status === "booked" ||
      existing?.booking_status === "waitlisted" ||
      existing?.booking_status === "walk_in"
    ) {
      result.skipped.alreadyBooked += 1;
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
