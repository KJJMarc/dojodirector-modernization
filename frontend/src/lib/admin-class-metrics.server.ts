import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { loadClubMembershipRows } from "@/lib/admin-club-memberships.server";
import type { AdminClassMetricsPageData } from "@/lib/admin-class-metrics.shared";
import {
  isNoShow,
  isNoShowTrackingEligibleStudentMembership,
  isPresentAttendanceStatus,
  isRetrospectiveMetricsSession,
  resolveNoShowTrackingStatus,
} from "@/lib/admin-class-metrics.shared";
import type {
  ClassPopularityRow,
  ClassTrendRow,
  DayTimePopularityRow,
  InstructorMetricRow,
  NoShowStudentRow,
} from "@/lib/admin-class-metrics.shared";
import {
  formatDayOfWeekLabel,
  formatScheduleTimeLabel,
} from "@/lib/admin-recurring-classes.shared";
import { formatSessionLocation } from "@/lib/booking";
import {
  addLondonCalendarDays,
  getLondonTodayDateKey,
  londonLocalDateTimeToUtcIso,
} from "@/lib/london-datetime";
import {
  formatScheduleDayLabel,
  resolveEffectiveRecurringScheduleId,
  resolveSessionLocationFromRow,
  resolveSessionSlotTimeFromRow,
} from "@/lib/class-session-schedule";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface InstructorAssignmentRow {
  instructor_user_id: string;
  recurring_schedule_id: string | null;
  class_session_id: string | null;
}

async function loadInstructorResolutionBySessionId(
  clubId: string,
  sessions: MetricsSessionRow[],
  effectiveScheduleIdBySessionId: Map<string, string>,
) {
  const instructorNameBySessionId = new Map<string, string>();
  const instructorUserIdBySessionId = new Map<string, string>();

  if (sessions.length === 0) {
    return { instructorNameBySessionId, instructorUserIdBySessionId };
  }

  const supabase = getSupabaseAdminClient();
  const { data: assignments, error: assignmentsError } = await supabase
    .from("instructor_assignments")
    .select("instructor_user_id, recurring_schedule_id, class_session_id")
    .eq("club_id", clubId)
    .eq("is_active", true);

  if (assignmentsError) {
    return { instructorNameBySessionId, instructorUserIdBySessionId };
  }

  const sessionAssignmentBySessionId = new Map<string, string>();
  const recurringAssignmentByScheduleId = new Map<string, string>();

  for (const assignment of (assignments ?? []) as InstructorAssignmentRow[]) {
    if (assignment.class_session_id) {
      sessionAssignmentBySessionId.set(
        assignment.class_session_id,
        assignment.instructor_user_id,
      );
      continue;
    }

    if (assignment.recurring_schedule_id) {
      recurringAssignmentByScheduleId.set(
        assignment.recurring_schedule_id,
        assignment.instructor_user_id,
      );
    }
  }

  const instructorUserIds = new Set<string>();

  for (const session of sessions) {
    const sessionOverrideId = sessionAssignmentBySessionId.get(session.id);
    const effectiveScheduleId = effectiveScheduleIdBySessionId.get(session.id);
    const instructorUserId =
      sessionOverrideId ??
      (effectiveScheduleId
        ? recurringAssignmentByScheduleId.get(effectiveScheduleId)
        : undefined);

    if (instructorUserId) {
      instructorUserIdBySessionId.set(session.id, instructorUserId);
      instructorUserIds.add(instructorUserId);
    }
  }

  const instructorNameByUserId = new Map<string, string>();

  if (instructorUserIds.size > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", Array.from(instructorUserIds));

    if (!usersError) {
      for (const user of (users ?? []) as UserRow[]) {
        instructorNameByUserId.set(
          user.id,
          getStudentFullName(user.first_name, user.last_name),
        );
      }
    }
  }

  for (const session of sessions) {
    const instructorUserId = instructorUserIdBySessionId.get(session.id);

    if (!instructorUserId) {
      continue;
    }

    const instructorName = instructorNameByUserId.get(instructorUserId);

    if (instructorName) {
      instructorNameBySessionId.set(session.id, instructorName);
    }
  }

  return { instructorNameBySessionId, instructorUserIdBySessionId };
}

const METRICS_LOOKBACK_DAYS = 90;
const RECENT_NO_SHOW_DAYS = 30;

const BOOKING_STATUSES = new Set(["booked", "walk_in", "waitlisted"]);

interface MetricsSessionRow {
  id: string;
  class_id: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  recurring_schedule_id: string | null;
  status: string | null;
  source: string | null;
  external_id: string | null;
}

interface MetricsAttendeeRow {
  id: string;
  class_session_id: string;
  user_id: string;
  booking_status: string | null;
  attendance_status: string | null;
}

interface ClassNameRow {
  id: string;
  name: string;
}

interface RecurringScheduleRow {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  location: string | null;
  is_active: boolean;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ClassSlotAggregate {
  classId: string;
  className: string;
  scheduleKey: string;
  scheduleLabel: string;
  dayLabel: string;
  timeLabel: string;
  locationLabel: string;
  instructorLabels: Map<string, number>;
  totalBookings: number;
  attendanceCount: number;
  totalCapacity: number;
  capacityKnownSessions: number;
  sessionCount: number;
  noShowCount: number;
}

function getMetricsDateRange() {
  const now = new Date();
  const todayKey = getLondonTodayDateKey(now);
  const startKey = addLondonCalendarDays(todayKey, -METRICS_LOOKBACK_DAYS);
  const endKey = addLondonCalendarDays(todayKey, 14);

  return {
    startIso: londonLocalDateTimeToUtcIso(startKey, "00:00"),
    endIso: londonLocalDateTimeToUtcIso(endKey, "00:00"),
    nowIso: now.toISOString(),
    recentNoShowCutoffIso: new Date(
      now.getTime() - RECENT_NO_SHOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

function countsAsBooking(status: string | null) {
  return status != null && BOOKING_STATUSES.has(status);
}

function formatUtilisationPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 100);
}

function resolveMetricsSessionContext(
  session: MetricsSessionRow,
  schedules: RecurringScheduleRow[],
  scheduleById: Map<string, RecurringScheduleRow>,
) {
  const effectiveScheduleId = resolveEffectiveRecurringScheduleId(session, schedules, {
    activeOnly: false,
  });
  const schedule = effectiveScheduleId
    ? (scheduleById.get(effectiveScheduleId) ?? null)
    : null;

  return {
    effectiveScheduleId,
    schedule,
    slotKey: `${session.class_id}:${effectiveScheduleId ?? "adhoc"}`,
    dayLabel: schedule
      ? formatDayOfWeekLabel(schedule.day_of_week)
      : formatScheduleDayLabel(session.starts_at),
    timeLabel: schedule
      ? formatScheduleTimeLabel(schedule.start_time)
      : formatScheduleTimeLabel(resolveSessionSlotTimeFromRow(session)),
    locationLabel: formatSessionLocation(
      schedule?.location ?? resolveSessionLocationFromRow(session) ?? null,
    ),
  };
}

function pickTopInstructor(instructorCounts: Map<string, number>) {
  let topName = "—";
  let topCount = 0;

  for (const [name, count] of Array.from(instructorCounts.entries())) {
    if (count > topCount) {
      topCount = count;
      topName = name;
    }
  }

  return topName;
}

function buildScheduleLabel(
  className: string,
  dayLabel: string,
  timeLabel: string,
) {
  return `${className} · ${dayLabel} ${timeLabel}`;
}

export async function getAdminClassMetricsPageData(
  clubId: string,
): Promise<AdminClassMetricsPageData> {
  const supabase = getSupabaseAdminClient();
  const { startIso, endIso, nowIso, recentNoShowCutoffIso } = getMetricsDateRange();

  const membershipRows = await loadClubMembershipRows(clubId);
  const eligibleNoShowStudentUserIds = new Set(
    membershipRows
      .filter(isNoShowTrackingEligibleStudentMembership)
      .map((membership) => membership.user_id),
  );

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("class_sessions")
    .select(
      "id, class_id, starts_at, ends_at, capacity, recurring_schedule_id, status, source, external_id",
    )
    .eq("club_id", clubId)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .neq("status", "cancelled");

  if (sessionsError) {
    throw new Error(`Unable to load class sessions: ${sessionsError.message}`);
  }

  const sessions = (sessionRows ?? []) as MetricsSessionRow[];

  if (sessions.length === 0) {
    return {
      periodLabel: `Last ${METRICS_LOOKBACK_DAYS} days`,
      totalNoShows: 0,
      popularClasses: [],
      instructorMetrics: [],
      noShowStudents: [],
      trends: {
        mostAttended: [],
        leastAttended: [],
        poorUtilisation: [],
        repeatedNoShows: [],
        popularDayTimes: [],
      },
      hasSessionData: false,
      trackedClassSlots: 0,
    };
  }

  const sessionIds = sessions.map((session) => session.id);
  const classIds = Array.from(new Set(sessions.map((session) => session.class_id)));

  const [attendeesResult, classesResult, schedulesResult] = await Promise.all([
    supabase
      .from("session_attendees")
      .select("id, class_session_id, user_id, booking_status, attendance_status")
      .in("class_session_id", sessionIds),
    supabase.from("classes").select("id, name").in("id", classIds),
    supabase
      .from("recurring_class_schedules")
      .select("id, class_id, day_of_week, start_time, location, is_active")
      .eq("club_id", clubId),
  ]);

  if (attendeesResult.error) {
    throw new Error(`Unable to load bookings: ${attendeesResult.error.message}`);
  }

  if (classesResult.error) {
    throw new Error(`Unable to load classes: ${classesResult.error.message}`);
  }

  if (schedulesResult.error) {
    throw new Error(
      `Unable to load recurring schedules: ${schedulesResult.error.message}`,
    );
  }

  const classNameById = new Map(
    ((classesResult.data ?? []) as ClassNameRow[]).map((row) => [row.id, row.name]),
  );
  const schedules = (schedulesResult.data ?? []) as RecurringScheduleRow[];
  const scheduleById = new Map(schedules.map((row) => [row.id, row]));
  const effectiveScheduleIdBySessionId = new Map<string, string>();

  for (const session of sessions) {
    const effectiveScheduleId = resolveEffectiveRecurringScheduleId(session, schedules, {
      activeOnly: false,
    });

    if (effectiveScheduleId) {
      effectiveScheduleIdBySessionId.set(session.id, effectiveScheduleId);
    }
  }

  const { instructorNameBySessionId, instructorUserIdBySessionId } =
    await loadInstructorResolutionBySessionId(
      clubId,
      sessions,
      effectiveScheduleIdBySessionId,
    );

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const attendees = (attendeesResult.data ?? []) as MetricsAttendeeRow[];

  const slotAggregates = new Map<string, ClassSlotAggregate>();
  const instructorAggregates = new Map<
    string,
    {
      instructorUserId: string;
      instructorName: string;
      totalBookings: number;
      attendanceCount: number;
      sessionIds: Set<string>;
    }
  >();
  const noShowByUser = new Map<
    string,
    { total: number; recent: number; lastAt: string | null }
  >();
  const dayTimeAggregates = new Map<
    string,
    { dayLabel: string; timeLabel: string; bookings: number; attendance: number }
  >();

  let totalNoShows = 0;

  for (const session of sessions) {
    const className = classNameById.get(session.class_id) ?? "Unnamed class";
    const { slotKey, dayLabel, timeLabel, locationLabel } =
      resolveMetricsSessionContext(session, schedules, scheduleById);
    const instructorName =
      instructorNameBySessionId.get(session.id) ?? "Unassigned";
    const scheduleLabel = buildScheduleLabel(className, dayLabel, timeLabel);

    if (!slotAggregates.has(slotKey)) {
      slotAggregates.set(slotKey, {
        classId: session.class_id,
        className,
        scheduleKey: slotKey,
        scheduleLabel,
        dayLabel,
        timeLabel,
        locationLabel,
        instructorLabels: new Map(),
        totalBookings: 0,
        attendanceCount: 0,
        totalCapacity: 0,
        capacityKnownSessions: 0,
        sessionCount: 0,
        noShowCount: 0,
      });
    }

    const slot = slotAggregates.get(slotKey)!;
    slot.sessionCount += 1;

    if (session.capacity != null && session.capacity > 0) {
      slot.totalCapacity += session.capacity;
      slot.capacityKnownSessions += 1;
    }

    slot.instructorLabels.set(
      instructorName,
      (slot.instructorLabels.get(instructorName) ?? 0) + 1,
    );

    const dayTimeKey = `${dayLabel}|${timeLabel}`;
    if (!dayTimeAggregates.has(dayTimeKey)) {
      dayTimeAggregates.set(dayTimeKey, {
        dayLabel,
        timeLabel,
        bookings: 0,
        attendance: 0,
      });
    }
  }

  for (const attendee of attendees) {
    const session = sessionById.get(attendee.class_session_id);

    if (!session) {
      continue;
    }

    const { slotKey, dayLabel, timeLabel } = resolveMetricsSessionContext(
      session,
      schedules,
      scheduleById,
    );
    const slot = slotAggregates.get(slotKey);

    if (!slot) {
      continue;
    }

    const instructorUserId = instructorUserIdBySessionId.get(session.id);
    const instructorName =
      instructorNameBySessionId.get(session.id) ?? "Unassigned";
    const dayTimeKey = `${dayLabel}|${timeLabel}`;
    const dayTime = dayTimeAggregates.get(dayTimeKey);

    if (countsAsBooking(attendee.booking_status)) {
      slot.totalBookings += 1;

      if (dayTime) {
        dayTime.bookings += 1;
      }

      if (
        instructorUserId &&
        isRetrospectiveMetricsSession(session, nowIso)
      ) {
        const instructorEntry = instructorAggregates.get(instructorUserId) ?? {
          instructorUserId,
          instructorName,
          totalBookings: 0,
          attendanceCount: 0,
          sessionIds: new Set<string>(),
        };

        instructorEntry.totalBookings += 1;
        instructorEntry.sessionIds.add(session.id);
        instructorAggregates.set(instructorUserId, instructorEntry);
      }
    }

    if (isPresentAttendanceStatus(attendee.attendance_status)) {
      slot.attendanceCount += 1;

      if (dayTime) {
        dayTime.attendance += 1;
      }

      if (
        instructorUserId &&
        isRetrospectiveMetricsSession(session, nowIso)
      ) {
        const instructorEntry = instructorAggregates.get(instructorUserId);

        if (instructorEntry) {
          instructorEntry.attendanceCount += 1;
        }
      }
    }

    if (
      attendee.user_id &&
      eligibleNoShowStudentUserIds.has(attendee.user_id) &&
      isNoShow(
        attendee.booking_status,
        attendee.attendance_status,
        session,
        nowIso,
      )
    ) {
      totalNoShows += 1;
      slot.noShowCount += 1;

      const existing = noShowByUser.get(attendee.user_id) ?? {
        total: 0,
        recent: 0,
        lastAt: null,
      };

      existing.total += 1;

      if (session.starts_at >= recentNoShowCutoffIso) {
        existing.recent += 1;
      }

      if (!existing.lastAt || session.starts_at > existing.lastAt) {
        existing.lastAt = session.starts_at;
      }

      noShowByUser.set(attendee.user_id, existing);
    }
  }

  const popularClasses: ClassPopularityRow[] = Array.from(slotAggregates.values())
    .sort((left, right) => right.totalBookings - left.totalBookings)
    .slice(0, 12)
    .map((slot, index) => ({
      rank: index + 1,
      classId: slot.classId,
      className: slot.className,
      scheduleLabel: slot.scheduleLabel,
      dayLabel: slot.dayLabel,
      timeLabel: slot.timeLabel,
      locationLabel: slot.locationLabel,
      instructorLabel: pickTopInstructor(slot.instructorLabels),
      totalBookings: slot.totalBookings,
      attendanceCount: slot.attendanceCount,
      utilisationPercent: formatUtilisationPercent(
        slot.totalBookings,
        slot.totalCapacity,
      ),
      sessionCount: slot.sessionCount,
    }));

  const instructorMetrics: InstructorMetricRow[] = Array.from(
    instructorAggregates.values(),
  )
    .sort((left, right) => right.totalBookings - left.totalBookings)
    .map((row, index) => {
      let instructorCapacity = 0;

      for (const sessionId of Array.from(row.sessionIds)) {
        const taughtSession = sessionById.get(sessionId);

        if (taughtSession?.capacity != null && taughtSession.capacity > 0) {
          instructorCapacity += taughtSession.capacity;
        }
      }

      return {
        rank: index + 1,
        instructorUserId: row.instructorUserId,
        instructorName: row.instructorName,
        totalBookings: row.totalBookings,
        attendanceCount: row.attendanceCount,
        sessionsTaught: row.sessionIds.size,
        averageAttendancePerSession:
          row.sessionIds.size > 0
            ? Math.round((row.attendanceCount / row.sessionIds.size) * 10) / 10
            : null,
        utilisationPercent: formatUtilisationPercent(
          row.totalBookings,
          instructorCapacity,
        ),
      };
    });

  const noShowUserIds = Array.from(noShowByUser.keys());

  const userById = new Map<string, UserRow>();

  if (noShowUserIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", noShowUserIds);

    if (usersError) {
      throw new Error(`Unable to load students: ${usersError.message}`);
    }

    for (const user of (users ?? []) as UserRow[]) {
      userById.set(user.id, user);
    }
  }

  const noShowStudents: NoShowStudentRow[] = Array.from(noShowByUser.entries())
    .map(([userId, stats]) => {
      const user = userById.get(userId);

      return {
        userId,
        studentName: getStudentFullName(user?.first_name ?? null, user?.last_name ?? null),
        email: user?.email ?? null,
        totalNoShows: stats.total,
        recentNoShows: stats.recent,
        status: resolveNoShowTrackingStatus(stats.total),
        lastNoShowDate: stats.lastAt,
      };
    })
    .sort((left, right) => right.totalNoShows - left.totalNoShows);

  const slotsByAttendance = Array.from(slotAggregates.values()).filter(
    (slot) => slot.attendanceCount > 0,
  );

  const toTrendRow = (
    slot: ClassSlotAggregate,
    metricLabel: string,
    valueLabel: string,
  ): ClassTrendRow => ({
    className: slot.className,
    scheduleLabel: slot.scheduleLabel,
    metricLabel,
    valueLabel,
  });

  const mostAttended = [...slotsByAttendance]
    .sort((left, right) => right.attendanceCount - left.attendanceCount)
    .slice(0, 5)
    .map((slot) =>
      toTrendRow(slot, "Attendance", `${slot.attendanceCount} present`),
    );

  const leastAttended = [...slotsByAttendance]
    .sort((left, right) => left.attendanceCount - right.attendanceCount)
    .slice(0, 5)
    .map((slot) =>
      toTrendRow(slot, "Attendance", `${slot.attendanceCount} present`),
    );

  const poorUtilisation = Array.from(slotAggregates.values())
    .filter((slot) => slot.totalCapacity > 0 && slot.totalBookings > 0)
    .map((slot) => ({
      slot,
      utilisation: formatUtilisationPercent(slot.totalBookings, slot.totalCapacity) ?? 0,
    }))
    .sort((left, right) => left.utilisation - right.utilisation)
    .slice(0, 5)
    .map(({ slot, utilisation }) =>
      toTrendRow(slot, "Utilisation", `${utilisation}% booked vs capacity`),
    );

  const repeatedNoShows = Array.from(slotAggregates.values())
    .filter((slot) => slot.noShowCount >= 2)
    .sort((left, right) => right.noShowCount - left.noShowCount)
    .slice(0, 5)
    .map((slot) => toTrendRow(slot, "No-shows", `${slot.noShowCount} no-shows`));

  const popularDayTimes: DayTimePopularityRow[] = Array.from(dayTimeAggregates.values())
    .sort((left, right) => right.bookings - left.bookings)
    .slice(0, 8)
    .map((row) => ({
      dayLabel: row.dayLabel,
      timeLabel: row.timeLabel,
      totalBookings: row.bookings,
      attendanceCount: row.attendance,
    }));

  return {
    periodLabel: `Last ${METRICS_LOOKBACK_DAYS} days (plus 14 days ahead for bookings)`,
    totalNoShows,
    popularClasses,
    instructorMetrics,
    noShowStudents,
    trends: {
      mostAttended,
      leastAttended,
      poorUtilisation,
      repeatedNoShows,
      popularDayTimes,
    },
    hasSessionData: true,
    trackedClassSlots: slotAggregates.size,
  };
}
