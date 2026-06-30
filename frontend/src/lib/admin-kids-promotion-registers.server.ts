import "server-only";

import { loadPromotionCandidates, loadPromotionCandidatesForUserIds } from "@/lib/admin-belt-promotion.server";
import type { PromotionCandidate } from "@/lib/admin-belt-promotion.shared";
import {
  filterJuniorPromotionCandidates,
  isKidsPromotionCandidatesOnRegistersClub,
  type KidsPromotionRegisterAttendee,
  type KidsPromotionRegisterDateGroup,
  type KidsPromotionRegistersFilter,
  type KidsPromotionRegistersViewData,
  type KidsPromotionRegisterSession,
} from "@/lib/admin-kids-promotion-registers.shared";
import { requireClubBjjProgramme } from "@/lib/admin-programmes.server";
import {
  getAttendanceScheduleFilterDateRange,
  type AttendanceScheduleFilter,
} from "@/lib/attendance-schedule";
import { ATTENDANCE_REGISTER_BOOKING_STATUSES } from "@/lib/attendance-register-booking.shared";
import {
  compareAttendanceRegisterNames,
  getStudentFullName,
} from "@/lib/attendance";
import {
  buildSessionDisplayLabels,
  formatScheduleDayLabel,
  resolveScheduleDateKey,
} from "@/lib/class-session-schedule";
import { loadClassScheduleSessions } from "@/lib/class-session-schedule.server";
import { loadGuestBookingProfilesById } from "@/lib/guest-booking-session-attendee.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const SUPABASE_PAGE_SIZE = 1000;

interface SessionAttendeeRegisterRow {
  id: string;
  class_session_id: string;
  user_id: string | null;
  guest_booking_id: string | null;
  attendance_status: string | null;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

async function loadBjjClassIdsForClub(clubId: string, programmeId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .eq("club_id", clubId)
    .eq("programme_id", programmeId)
    .neq("is_active", false);

  if (error) {
    throw new Error(`Failed to load BJJ classes: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.id as string));
}

async function loadSessionAttendeeRegisterRows(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const rows: SessionAttendeeRegisterRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("session_attendees")
      .select("id, class_session_id, user_id, guest_booking_id, attendance_status")
      .in("class_session_id", sessionIds)
      .in("booking_status", [...ATTENDANCE_REGISTER_BOOKING_STATUSES])
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load session attendees: ${error.message}`);
    }

    const page = (data ?? []) as SessionAttendeeRegisterRow[];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      break;
    }

    from += SUPABASE_PAGE_SIZE;
  }

  return rows.filter((row) => row.user_id || row.guest_booking_id);
}

function buildPromotionCandidateMap(candidates: PromotionCandidate[]) {
  return new Map(candidates.map((candidate) => [candidate.id, candidate]));
}

function buildRegisterAttendee(
  row: SessionAttendeeRegisterRow,
  userById: Map<string, UserRow>,
  guestById: Awaited<ReturnType<typeof loadGuestBookingProfilesById>>,
  candidateByUserId: Map<string, PromotionCandidate>,
): KidsPromotionRegisterAttendee {
  const user = row.user_id ? userById.get(row.user_id) : null;
  const guest = row.guest_booking_id ? guestById.get(row.guest_booking_id) : null;
  const firstName = user?.first_name ?? guest?.first_name ?? null;
  const lastName = user?.last_name ?? guest?.last_name ?? null;
  const promotionCandidate = row.user_id
    ? (candidateByUserId.get(row.user_id) ?? null)
    : null;

  return {
    attendeeId: row.id,
    userId: row.user_id,
    firstName,
    lastName,
    fullName: getStudentFullName(firstName, lastName),
    attendanceStatus: row.attendance_status,
    isPromotionCandidate: Boolean(promotionCandidate),
    promotionCandidate,
  };
}

function groupSessionsByDate(
  sessions: KidsPromotionRegisterSession[],
): KidsPromotionRegisterDateGroup[] {
  const groups = new Map<string, KidsPromotionRegisterDateGroup>();

  for (const session of sessions) {
    const dateKey = resolveScheduleDateKey({
      startsAt: session.startsAt,
      externalId: session.externalId,
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        dateKey,
        dateLabel: session.dateLabel,
        dayLabel: session.dayLabel,
        sessions: [],
      });
    }

    groups.get(dateKey)!.sessions.push(session);
  }

  return Array.from(groups.values());
}

export interface LoadKidsPromotionRegistersOptions {
  /** Evaluate promotion eligibility only for students booked on loaded sessions. */
  promotionScope?: "club" | "session-attendees";
  /** Omit attendee payloads from the initial response (load per session on demand). */
  attendeesMode?: "full" | "lazy";
  /** Filter sessions before grouping (instructor candidates view uses "candidates"). */
  filter?: KidsPromotionRegistersFilter;
  /** Materialise recurring sessions before querying (needed for single-day instructor views). */
  ensureRecurringSessions?: boolean;
}

function countPromotionCandidatesForSession(
  sessionId: string,
  attendeeRows: SessionAttendeeRegisterRow[],
  candidateByUserId: Map<string, PromotionCandidate>,
) {
  return attendeeRows.reduce((count, row) => {
    if (row.class_session_id !== sessionId) {
      return count;
    }

    return row.user_id && candidateByUserId.has(row.user_id) ? count + 1 : count;
  }, 0);
}

export async function loadKidsPromotionCandidatesOnRegisters(
  clubId: string,
  clubSlug: string,
  clubName: string,
  scheduleFilter: AttendanceScheduleFilter = { mode: "default" },
  options?: LoadKidsPromotionRegistersOptions,
): Promise<KidsPromotionRegistersViewData> {
  if (!isKidsPromotionCandidatesOnRegistersClub(clubSlug)) {
    throw new Error("Promotion candidates on registers is only available for Kingston Jiu Jitsu Kids.");
  }

  const bjjProgramme = await requireClubBjjProgramme(clubId);
  const bjjClassIds = await loadBjjClassIdsForClub(clubId, bjjProgramme.id);
  const { startIso, endIso } = getAttendanceScheduleFilterDateRange(scheduleFilter);
  const ensureRecurringSessions =
    options?.ensureRecurringSessions ?? scheduleFilter.mode === "default";
  const promotionScope = options?.promotionScope ?? "club";
  const attendeesMode = options?.attendeesMode ?? "full";
  const registerFilter = options?.filter ?? "all";

  const scheduleSessions = await loadClassScheduleSessions({
    startIso,
    endIso,
    clubId,
    activeClassesOnly: true,
    includeCancelled: false,
    ensureRecurringSessions,
  });

  const bjjSessions = scheduleSessions.filter(
    (session) => bjjClassIds.has(session.classId) && !session.isCancelled,
  );
  const sessionIds = bjjSessions.map((session) => session.id);
  const attendeeRows =
    sessionIds.length > 0
      ? await loadSessionAttendeeRegisterRows(sessionIds)
      : [];

  const userIdsForPromotion = Array.from(
    new Set(
      attendeeRows
        .map((row) => row.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );

  const allCandidates =
    promotionScope === "session-attendees"
      ? await loadPromotionCandidatesForUserIds(clubId, userIdsForPromotion)
      : await loadPromotionCandidates(clubId);

  const juniorCandidates = filterJuniorPromotionCandidates(allCandidates);
  const candidateByUserId = buildPromotionCandidateMap(juniorCandidates);

  if (attendeesMode === "lazy") {
    const sessions: KidsPromotionRegisterSession[] = bjjSessions
      .map((session) => {
        const labels = buildSessionDisplayLabels({
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          externalId: session.externalId,
        });
        const promotionCandidateCount = countPromotionCandidatesForSession(
          session.id,
          attendeeRows,
          candidateByUserId,
        );

        return {
          id: session.id,
          className: session.className,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          externalId: session.externalId,
          location: session.location,
          dateLabel: labels.dateLabel,
          dayLabel: formatScheduleDayLabel(session.startsAt),
          timeLabel: labels.timeLabel,
          bookedCount: attendeeRows.filter((row) => row.class_session_id === session.id)
            .length,
          attendees: [],
          promotionCandidateCount,
        };
      })
      .filter((session) =>
        registerFilter === "candidates" ? session.promotionCandidateCount > 0 : true,
      );

    return {
      clubSlug,
      clubName,
      juniorPromotionCandidateCount: juniorCandidates.length,
      dateGroups: groupSessionsByDate(sessions),
    };
  }

  const userIds = userIdsForPromotion;
  const guestBookingIds = Array.from(
    new Set(
      attendeeRows
        .map((row) => row.guest_booking_id)
        .filter((guestBookingId): guestBookingId is string => Boolean(guestBookingId)),
    ),
  );

  const supabase = getSupabaseAdminClient();
  const [{ data: userRows, error: usersError }, guestById] = await Promise.all([
    userIds.length > 0
      ? supabase.from("users").select("id, first_name, last_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    loadGuestBookingProfilesById(guestBookingIds),
  ]);

  if (usersError) {
    throw new Error(`Failed to load attendee profiles: ${usersError.message}`);
  }

  const userById = new Map(
    ((userRows ?? []) as UserRow[]).map((user) => [user.id, user]),
  );

  const attendeesBySessionId = new Map<string, KidsPromotionRegisterAttendee[]>();

  for (const row of attendeeRows) {
    const attendee = buildRegisterAttendee(
      row,
      userById,
      guestById,
      candidateByUserId,
    );
    const sessionAttendees = attendeesBySessionId.get(row.class_session_id) ?? [];
    sessionAttendees.push(attendee);
    attendeesBySessionId.set(row.class_session_id, sessionAttendees);
  }

  const sessions: KidsPromotionRegisterSession[] = bjjSessions
    .map((session) => {
    const labels = buildSessionDisplayLabels({
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      externalId: session.externalId,
    });
    const attendees = [...(attendeesBySessionId.get(session.id) ?? [])].sort(
      (left, right) =>
        compareAttendanceRegisterNames(
          left.firstName,
          left.lastName,
          right.firstName,
          right.lastName,
        ),
    );
    const promotionCandidateCount = attendees.filter(
      (attendee) => attendee.isPromotionCandidate,
    ).length;

    return {
      id: session.id,
      className: session.className,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      externalId: session.externalId,
      location: session.location,
      dateLabel: labels.dateLabel,
      dayLabel: formatScheduleDayLabel(session.startsAt),
      timeLabel: labels.timeLabel,
      bookedCount: attendees.length,
      attendees,
      promotionCandidateCount,
    };
  })
    .filter((session) =>
      registerFilter === "candidates" ? session.promotionCandidateCount > 0 : true,
    );

  return {
    clubSlug,
    clubName,
    juniorPromotionCandidateCount: juniorCandidates.length,
    dateGroups: groupSessionsByDate(sessions),
  };
}

export async function loadKidsPromotionRegisterSessionCandidates(
  clubId: string,
  clubSlug: string,
  sessionId: string,
): Promise<KidsPromotionRegisterAttendee[] | null> {
  if (!isKidsPromotionCandidatesOnRegistersClub(clubSlug)) {
    throw new Error("Promotion candidates on registers is only available for Kingston Jiu Jitsu Kids.");
  }

  const bjjProgramme = await requireClubBjjProgramme(clubId);
  const bjjClassIds = await loadBjjClassIdsForClub(clubId, bjjProgramme.id);
  const supabase = getSupabaseAdminClient();
  const { data: sessionRow, error: sessionError } = await supabase
    .from("class_sessions")
    .select("id, class_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(`Failed to load class session: ${sessionError.message}`);
  }

  if (!sessionRow || !bjjClassIds.has(sessionRow.class_id as string)) {
    return null;
  }

  const attendeeRows = await loadSessionAttendeeRegisterRows([sessionId]);
  const userIds = Array.from(
    new Set(
      attendeeRows
        .map((row) => row.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );
  const guestBookingIds = Array.from(
    new Set(
      attendeeRows
        .map((row) => row.guest_booking_id)
        .filter((guestBookingId): guestBookingId is string => Boolean(guestBookingId)),
    ),
  );

  const juniorCandidates = filterJuniorPromotionCandidates(
    await loadPromotionCandidatesForUserIds(clubId, userIds),
  );
  const candidateByUserId = buildPromotionCandidateMap(juniorCandidates);

  const [{ data: userRows, error: usersError }, guestById] = await Promise.all([
    userIds.length > 0
      ? supabase.from("users").select("id, first_name, last_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    loadGuestBookingProfilesById(guestBookingIds),
  ]);

  if (usersError) {
    throw new Error(`Failed to load attendee profiles: ${usersError.message}`);
  }

  const userById = new Map(
    ((userRows ?? []) as UserRow[]).map((user) => [user.id, user]),
  );

  return attendeeRows
    .map((row) => buildRegisterAttendee(row, userById, guestById, candidateByUserId))
    .filter((attendee) => attendee.isPromotionCandidate)
    .sort((left, right) =>
      compareAttendanceRegisterNames(
        left.firstName,
        left.lastName,
        right.firstName,
        right.lastName,
      ),
    );
}

export async function loadKidsPromotionRegisterSessionById(
  clubId: string,
  clubSlug: string,
  clubName: string,
  sessionId: string,
): Promise<KidsPromotionRegisterSession | null> {
  const data = await loadKidsPromotionCandidatesOnRegisters(clubId, clubSlug, clubName);

  for (const group of data.dateGroups) {
    const session = group.sessions.find((item) => item.id === sessionId);

    if (session) {
      return session;
    }
  }

  return null;
}
