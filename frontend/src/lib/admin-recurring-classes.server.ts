import "server-only";

import { getStudentFullName } from "@/lib/attendance";
import { ACTIVE_CLUB_ID } from "@/lib/branding";
import type { ProgrammeType } from "@/lib/admin-programme-types";
import {
  RECURRING_CLASS_SESSION_DAYS_AHEAD,
  sortRecurringClassSchedules,
  type RecurringClassDeleteStatus,
  type RecurringClassScheduleRow,
} from "@/lib/admin-recurring-classes.shared";
import type {
  CreateRecurringClassInput,
  UpdateRecurringClassInput,
} from "@/lib/admin-recurring-classes.input";
import { sessionBelongsToRecurringScheduleRow } from "@/lib/class-session-schedule";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type { RecurringClassScheduleRow, CreateRecurringClassInput };

interface RecurringScheduleQueryRow {
  id: string;
  club_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  location: string;
  is_active: boolean;
}

interface ClassTemplateRow {
  id: string;
  name: string;
  programme_type: ProgrammeType;
}

function mapRecurringScheduleRow(
  row: RecurringScheduleQueryRow,
  classById: Map<string, ClassTemplateRow>,
): RecurringClassScheduleRow {
  const classRow = classById.get(row.class_id);

  return {
    id: row.id,
    clubId: row.club_id,
    classId: row.class_id,
    className: classRow?.name ?? "Unnamed class",
    programmeType: classRow?.programme_type ?? "bjj",
    dayOfWeek: row.day_of_week,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    capacity: row.capacity,
    location: row.location,
    isActive: row.is_active,
  };
}

async function getClassTemplatesById(
  classIds: string[],
): Promise<Map<string, ClassTemplateRow>> {
  if (classIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, programme_type")
    .in("id", classIds);

  if (error) {
    throw new Error(`Failed to load class templates: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as ClassTemplateRow[]).map((row) => [row.id, row]),
  );
}

export async function getRecurringClassSchedules(
  clubId: string = ACTIVE_CLUB_ID,
): Promise<RecurringClassScheduleRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("recurring_class_schedules")
    .select(
      "id, club_id, class_id, day_of_week, start_time, end_time, capacity, location, is_active",
    )
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Failed to load recurring classes: ${error.message}`);
  }

  const rows = (data ?? []) as RecurringScheduleQueryRow[];
  const classById = await getClassTemplatesById(
    Array.from(new Set(rows.map((row) => row.class_id))),
  );

  return sortRecurringClassSchedules(
    rows.map((row) => mapRecurringScheduleRow(row, classById)),
  );
}

export async function getRecurringClassInstructorLabel(
  scheduleId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("instructor_assignments")
    .select("instructor_user_id")
    .eq("club_id", clubId)
    .eq("recurring_schedule_id", scheduleId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.instructor_user_id) {
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", data.instructor_user_id)
    .maybeSingle();

  if (userError || !user) {
    return null;
  }

  return getStudentFullName(user.first_name, user.last_name);
}

export async function getRecurringClassScheduleById(
  scheduleId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<RecurringClassScheduleRow | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("recurring_class_schedules")
    .select(
      "id, club_id, class_id, day_of_week, start_time, end_time, capacity, location, is_active",
    )
    .eq("id", scheduleId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load recurring class: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const classById = await getClassTemplatesById([(data as RecurringScheduleQueryRow).class_id]);

  return mapRecurringScheduleRow(data as RecurringScheduleQueryRow, classById);
}

async function findOrCreateClassTemplate(
  clubId: string,
  className: string,
  programmeType: ProgrammeType,
) {
  const supabase = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("classes")
    .select("id, programme_type, is_active")
    .eq("club_id", clubId)
    .eq("name", className)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to load class template: ${existingError.message}`);
  }

  if (existing) {
    if (existing.programme_type !== programmeType) {
      throw new Error(
        `Class "${className}" already exists with programme type ${existing.programme_type}.`,
      );
    }

    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase
    .from("classes")
    .insert({
      club_id: clubId,
      name: className,
      programme_type: programmeType,
      is_active: true,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(`Unable to create class template: ${createError.message}`);
  }

  return created.id as string;
}

const RECORDED_ATTENDANCE_STATUSES = ["present", "absent"] as const;

export interface RecurringSessionCapacitySyncResult {
  matchedCount: number;
  updatedCount: number;
  skippedAttendanceCount: number;
  skippedCancelledCount: number;
}

interface FutureRecurringSessionRow {
  id: string;
  starts_at: string;
  external_id: string | null;
  recurring_schedule_id: string | null;
  source: string | null;
  status: string | null;
}

function isUpdatableSessionStatus(status: string | null) {
  return status === "scheduled" || status === null;
}

export function formatRecurringSessionCapacitySyncSummary(
  result: RecurringSessionCapacitySyncResult,
) {
  const parts = [`${result.updatedCount} future session${result.updatedCount === 1 ? "" : "s"} updated`];

  if (result.skippedAttendanceCount > 0) {
    parts.push(
      `${result.skippedAttendanceCount} skipped (attendance recorded)`,
    );
  }

  if (result.skippedCancelledCount > 0) {
    parts.push(`${result.skippedCancelledCount} skipped (cancelled)`);
  }

  if (result.matchedCount === 0) {
    return "No matching future sessions found to update.";
  }

  return parts.join(" · ");
}

async function loadSessionIdsWithRecordedAttendance(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return new Set<string>();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("session_attendees")
    .select("class_session_id")
    .in("class_session_id", sessionIds)
    .in("attendance_status", [...RECORDED_ATTENDANCE_STATUSES]);

  if (error) {
    throw new Error(
      `Unable to load attendance for future sessions: ${error.message}`,
    );
  }

  return new Set(
    ((data ?? []) as Array<{ class_session_id: string }>).map(
      (row) => row.class_session_id,
    ),
  );
}

/** Sync capacity (and schedule link) onto future generated sessions for one recurring timetable row. */
export async function syncFutureRecurringSessionCapacity(input: {
  scheduleId: string;
  clubId: string;
  classId: string;
  dayOfWeek: number;
  startTime: string;
  location: string;
  capacity: number;
}): Promise<RecurringSessionCapacitySyncResult> {
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: sessionRows, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id, starts_at, external_id, recurring_schedule_id, source, status")
    .eq("club_id", input.clubId)
    .eq("class_id", input.classId)
    .gte("starts_at", nowIso);

  if (sessionsError) {
    throw new Error(`Unable to load future sessions: ${sessionsError.message}`);
  }

  const rows = (sessionRows ?? []) as FutureRecurringSessionRow[];
  let skippedCancelledCount = 0;

  const matchingSessions = rows.filter((session) => {
    const belongsToSchedule = sessionBelongsToRecurringScheduleRow(session, {
      scheduleId: input.scheduleId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      location: input.location,
    });

    if (!belongsToSchedule) {
      return false;
    }

    if (!isUpdatableSessionStatus(session.status)) {
      if (session.status === "cancelled") {
        skippedCancelledCount += 1;
      }

      return false;
    }

    return true;
  });

  if (matchingSessions.length === 0) {
    return {
      matchedCount: 0,
      updatedCount: 0,
      skippedAttendanceCount: 0,
      skippedCancelledCount,
    };
  }

  const sessionIdsWithAttendance = await loadSessionIdsWithRecordedAttendance(
    matchingSessions.map((session) => session.id),
  );

  const sessionIdsToUpdate = matchingSessions
    .map((session) => session.id)
    .filter((sessionId) => !sessionIdsWithAttendance.has(sessionId));

  const skippedAttendanceCount =
    matchingSessions.length - sessionIdsToUpdate.length;

  if (sessionIdsToUpdate.length === 0) {
    return {
      matchedCount: matchingSessions.length,
      updatedCount: 0,
      skippedAttendanceCount,
      skippedCancelledCount,
    };
  }

  const { error: updateError } = await supabase
    .from("class_sessions")
    .update({
      class_id: input.classId,
      capacity: input.capacity,
      recurring_schedule_id: input.scheduleId,
      updated_at: new Date().toISOString(),
    })
    .in("id", sessionIdsToUpdate);

  if (updateError) {
    throw new Error(`Unable to update future sessions: ${updateError.message}`);
  }

  return {
    matchedCount: matchingSessions.length,
    updatedCount: sessionIdsToUpdate.length,
    skippedAttendanceCount,
    skippedCancelledCount,
  };
}

export async function createRecurringClassSchedule(
  input: CreateRecurringClassInput,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const supabase = getSupabaseAdminClient();
  const classId = await findOrCreateClassTemplate(
    clubId,
    input.className,
    input.programmeType,
  );

  const { data: createdSchedule, error: scheduleError } = await supabase
    .from("recurring_class_schedules")
    .insert({
      club_id: clubId,
      class_id: classId,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      capacity: input.capacity,
      location: input.location,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single();

  if (scheduleError) {
    throw new Error(`Unable to create recurring class: ${scheduleError.message}`);
  }

  const scheduleId = createdSchedule?.id;

  if (!scheduleId) {
    throw new Error("Unable to create recurring class: missing schedule id.");
  }

  if (input.isActive ?? true) {
    const { error: generateError } = await supabase.rpc(
      "generate_recurring_class_sessions",
      {
        p_schedule_id: scheduleId,
        p_days_ahead: RECURRING_CLASS_SESSION_DAYS_AHEAD,
      },
    );

    if (generateError) {
      throw new Error(
        `Recurring class created but session generation failed: ${generateError.message}`,
      );
    }
  }

  return scheduleId as string;
}

export async function deactivateRecurringClassSchedule(scheduleId: string) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.rpc("deactivate_recurring_class_schedule", {
    p_schedule_id: scheduleId,
  });

  if (error) {
    throw new Error(`Unable to deactivate recurring class: ${error.message}`);
  }
}

export async function reactivateRecurringClassSchedule(scheduleId: string) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.rpc("reactivate_recurring_class_schedule", {
    p_schedule_id: scheduleId,
  });

  if (error) {
    throw new Error(`Unable to reactivate recurring class: ${error.message}`);
  }
}

export async function getRecurringClassDeleteStatuses(
  scheduleIds: string[],
  clubId: string = ACTIVE_CLUB_ID,
): Promise<Map<string, RecurringClassDeleteStatus>> {
  const statuses = new Map<string, RecurringClassDeleteStatus>();

  if (scheduleIds.length === 0) {
    return statuses;
  }

  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: sessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id, recurring_schedule_id, starts_at")
    .eq("club_id", clubId)
    .in("recurring_schedule_id", scheduleIds);

  if (sessionsError) {
    throw new Error(`Unable to load class sessions: ${sessionsError.message}`);
  }

  const sessionRows = sessions ?? [];
  const sessionIds = sessionRows.map((row) => row.id as string);
  const sessionsByScheduleId = new Map<string, typeof sessionRows>();

  for (const row of sessionRows) {
    const scheduleId = row.recurring_schedule_id as string | null;

    if (!scheduleId) {
      continue;
    }

    const list = sessionsByScheduleId.get(scheduleId) ?? [];
    list.push(row);
    sessionsByScheduleId.set(scheduleId, list);
  }

  const attendanceCountBySessionId = new Map<string, number>();

  if (sessionIds.length > 0) {
    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("class_session_id")
      .in("class_session_id", sessionIds);

    if (attendanceError) {
      throw new Error(
        `Unable to check attendance history: ${attendanceError.message}`,
      );
    }

    for (const row of attendanceRows ?? []) {
      const sessionId = row.class_session_id as string;
      attendanceCountBySessionId.set(
        sessionId,
        (attendanceCountBySessionId.get(sessionId) ?? 0) + 1,
      );
    }
  }

  for (const scheduleId of scheduleIds) {
    const scheduleSessions = sessionsByScheduleId.get(scheduleId) ?? [];
    let attendanceRecordCount = 0;
    let futureSessionCount = 0;

    for (const session of scheduleSessions) {
      attendanceRecordCount += attendanceCountBySessionId.get(session.id as string) ?? 0;

      if ((session.starts_at as string) >= nowIso) {
        futureSessionCount += 1;
      }
    }

    if (attendanceRecordCount > 0) {
      statuses.set(scheduleId, {
        canDelete: false,
        attendanceRecordCount,
        futureSessionCount,
        message:
          "This recurring class has attendance history. Deactivate it instead of deleting so past records stay intact.",
      });
      continue;
    }

    statuses.set(scheduleId, {
      canDelete: true,
      attendanceRecordCount: 0,
      futureSessionCount,
      message:
        "Permanent delete will remove this recurring template and future sessions/bookings. Past sessions are kept.",
    });
  }

  return statuses;
}

export async function getRecurringClassDeleteStatus(
  scheduleId: string,
  clubId: string = ACTIVE_CLUB_ID,
): Promise<RecurringClassDeleteStatus> {
  const statuses = await getRecurringClassDeleteStatuses([scheduleId], clubId);
  return (
    statuses.get(scheduleId) ?? {
      canDelete: true,
      attendanceRecordCount: 0,
      futureSessionCount: 0,
      message:
        "Permanent delete will remove this recurring template and future sessions/bookings.",
    }
  );
}

export async function deleteRecurringClassSchedulePermanently(
  scheduleId: string,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const deleteStatus = await getRecurringClassDeleteStatus(scheduleId, clubId);

  if (!deleteStatus.canDelete) {
    throw new Error(deleteStatus.message);
  }

  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: futureSessions, error: futureSessionsError } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("club_id", clubId)
    .eq("recurring_schedule_id", scheduleId)
    .gte("starts_at", nowIso);

  if (futureSessionsError) {
    throw new Error(
      `Unable to load future sessions: ${futureSessionsError.message}`,
    );
  }

  const futureSessionIds = (futureSessions ?? []).map((row) => row.id as string);

  if (futureSessionIds.length > 0) {
    const { error: attendeesError } = await supabase
      .from("session_attendees")
      .delete()
      .in("class_session_id", futureSessionIds);

    if (attendeesError) {
      throw new Error(
        `Unable to remove future bookings: ${attendeesError.message}`,
      );
    }

    const { error: deleteSessionsError } = await supabase
      .from("class_sessions")
      .delete()
      .in("id", futureSessionIds);

    if (deleteSessionsError) {
      throw new Error(
        `Unable to remove future sessions: ${deleteSessionsError.message}`,
      );
    }
  }

  const { error: deleteScheduleError } = await supabase
    .from("recurring_class_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("club_id", clubId);

  if (deleteScheduleError) {
    throw new Error(
      `Unable to delete recurring class: ${deleteScheduleError.message}`,
    );
  }
}

export async function updateRecurringClassSchedule(
  input: UpdateRecurringClassInput,
  clubId: string = ACTIVE_CLUB_ID,
) {
  const supabase = getSupabaseAdminClient();
  const existing = await getRecurringClassScheduleById(input.scheduleId, clubId);

  if (!existing) {
    throw new Error("Recurring class schedule not found.");
  }

  const classId = await findOrCreateClassTemplate(
    clubId,
    input.className,
    input.programmeType,
  );

  const { error: classUpdateError } = await supabase
    .from("classes")
    .update({
      name: input.className,
      programme_type: input.programmeType,
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", classId)
    .eq("club_id", clubId);

  if (classUpdateError) {
    throw new Error(`Unable to update class template: ${classUpdateError.message}`);
  }

  const wasActive = existing.isActive;
  const willBeActive = input.isActive ?? true;

  const { error: scheduleUpdateError } = await supabase
    .from("recurring_class_schedules")
    .update({
      class_id: classId,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      capacity: input.capacity,
      location: input.location,
      is_active: willBeActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.scheduleId)
    .eq("club_id", clubId);

  if (scheduleUpdateError) {
    throw new Error(
      `Unable to update recurring class: ${scheduleUpdateError.message}`,
    );
  }

  const sessionSync = await syncFutureRecurringSessionCapacity({
    scheduleId: input.scheduleId,
    clubId,
    classId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    location: input.location,
    capacity: input.capacity,
  });

  if (wasActive && !willBeActive) {
    await deactivateRecurringClassSchedule(input.scheduleId);
  } else if (!wasActive && willBeActive) {
    await reactivateRecurringClassSchedule(input.scheduleId);
  }

  return sessionSync;
}
