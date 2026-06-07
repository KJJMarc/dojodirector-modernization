import "server-only";

import { RECURRING_CLASS_SESSION_DAYS_AHEAD } from "@/lib/admin-recurring-classes.shared";
import {
  addLondonCalendarDays,
  encodeLocationForExternalId,
  getLondonTodayDateKey,
  londonLocalDateTimeToUtcIso,
  normalizeLondonClockTime,
  utcIsoToLondonDayOfWeek,
} from "@/lib/london-datetime";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface RecurringScheduleGenerationRow {
  id: string;
  club_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number | null;
  location: string | null;
  is_active: boolean;
}

export function isLondonWallClockOverloadMissingError(message: string) {
  return message.includes("london_wall_clock_to_timestamptz") && message.includes("does not exist");
}

async function loadRecurringScheduleForGeneration(
  scheduleId: string,
): Promise<RecurringScheduleGenerationRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("recurring_class_schedules")
    .select(
      "id, club_id, class_id, day_of_week, start_time, end_time, capacity, location, is_active",
    )
    .eq("id", scheduleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load recurring schedule: ${error.message}`);
  }

  return (data as RecurringScheduleGenerationRow | null) ?? null;
}

async function loadExistingSessionStartsAtKeys(
  schedule: RecurringScheduleGenerationRow,
  daysAhead: number,
) {
  const supabase = getSupabaseAdminClient();
  const todayKey = getLondonTodayDateKey();
  const endKey = addLondonCalendarDays(todayKey, daysAhead);
  const startIso = londonLocalDateTimeToUtcIso(todayKey, "00:00");
  const endIso = londonLocalDateTimeToUtcIso(endKey, "23:59");

  const { data, error } = await supabase
    .from("class_sessions")
    .select("starts_at, status")
    .eq("club_id", schedule.club_id)
    .eq("class_id", schedule.class_id)
    .gte("starts_at", startIso)
    .lte("starts_at", endIso);

  if (error) {
    throw new Error(`Unable to load existing sessions: ${error.message}`);
  }

  const keys = new Set<string>();

  for (const row of data ?? []) {
    if (row.status === "cancelled") {
      continue;
    }

    keys.add(new Date(row.starts_at as string).toISOString());
  }

  return keys;
}

async function generateRecurringClassSessionsFallback(
  scheduleId: string,
  daysAhead: number,
): Promise<number> {
  const schedule = await loadRecurringScheduleForGeneration(scheduleId);

  if (!schedule) {
    throw new Error(`Recurring class schedule not found: ${scheduleId}`);
  }

  if (!schedule.is_active) {
    return 0;
  }

  const existingStartsAt = await loadExistingSessionStartsAtKeys(schedule, daysAhead);
  const todayKey = getLondonTodayDateKey();
  const startTime = normalizeLondonClockTime(schedule.start_time);
  const endTime = normalizeLondonClockTime(schedule.end_time);
  const rows: {
    class_id: string;
    club_id: string;
    starts_at: string;
    ends_at: string;
    capacity: number | null;
    status: string;
    source: string;
    external_id: string;
    recurring_schedule_id: string;
  }[] = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const dateKey = addLondonCalendarDays(todayKey, offset);
    const startsAt = londonLocalDateTimeToUtcIso(dateKey, startTime);

    if (utcIsoToLondonDayOfWeek(startsAt) !== schedule.day_of_week) {
      continue;
    }

    if (existingStartsAt.has(startsAt)) {
      continue;
    }

    rows.push({
      class_id: schedule.class_id,
      club_id: schedule.club_id,
      starts_at: startsAt,
      ends_at: londonLocalDateTimeToUtcIso(dateKey, endTime),
      capacity: schedule.capacity,
      status: "scheduled",
      source: "admin_recurring",
      external_id: `admin_recurring:${schedule.id}:${dateKey}:${startTime}:${encodeLocationForExternalId(schedule.location ?? "")}`,
      recurring_schedule_id: schedule.id,
    });
    existingStartsAt.add(startsAt);
  }

  if (rows.length === 0) {
    return 0;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("class_sessions").insert(rows);

  if (error) {
    throw new Error(`Unable to generate recurring sessions: ${error.message}`);
  }

  return rows.length;
}

export async function generateRecurringClassSessions(
  scheduleId: string,
  daysAhead: number = RECURRING_CLASS_SESSION_DAYS_AHEAD,
): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("generate_recurring_class_sessions", {
    p_schedule_id: scheduleId,
    p_days_ahead: daysAhead,
  });

  if (!error) {
    return data ?? 0;
  }

  if (isLondonWallClockOverloadMissingError(error.message)) {
    return generateRecurringClassSessionsFallback(scheduleId, daysAhead);
  }

  throw new Error(`Unable to generate recurring sessions: ${error.message}`);
}
