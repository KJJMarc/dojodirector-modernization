#!/usr/bin/env node
/**
 * Upload Bahamas Jiu Jitsu recurring class timetable.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/upload-bahamas-recurring-classes.mjs --dry-run
 *   node frontend/scripts/upload-bahamas-recurring-classes.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LONDON_TIMEZONE = "Europe/London";
const BAHAMAS_CLUB_ID = "276cb805-7095-4e78-984b-bb41fb2cb664";
const BAHAMAS_CLUB_SLUG = "bahamas-jiu-jitsu";
const BJJ_PROGRAMME_ID = "99c5fd44-bcf5-4483-bdce-21b31e0c0851";
const LOCATION =
  "Old Fort Bay Shopping Centre, Building B, Unit 8";
const CAPACITY = 30;
const PROGRAMME_TYPE = "bjj";
/** Matches createRecurringClassSchedule() in admin-recurring-classes.server.ts */
const SESSION_DAYS_AHEAD = 364;

const SCHEDULES = [
  { dayOfWeek: 1, className: "Young Grapplers", startTime: "16:30", endTime: "17:30" },
  { dayOfWeek: 1, className: "Fundamentals", startTime: "18:15", endTime: "19:30" },
  { dayOfWeek: 2, className: "Adult No Gi", startTime: "12:15", endTime: "13:15" },
  { dayOfWeek: 2, className: "Adult No Gi", startTime: "18:15", endTime: "19:30" },
  { dayOfWeek: 3, className: "Young Grapplers", startTime: "16:30", endTime: "17:30" },
  { dayOfWeek: 3, className: "Adult Gi", startTime: "18:15", endTime: "19:30" },
  { dayOfWeek: 4, className: "Adult No Gi", startTime: "12:15", endTime: "13:15" },
  { dayOfWeek: 4, className: "Adult No Gi", startTime: "18:15", endTime: "19:30" },
  { dayOfWeek: 5, className: "Young Grapplers", startTime: "16:30", endTime: "17:30" },
  { dayOfWeek: 5, className: "Adult Gi", startTime: "18:15", endTime: "19:30" },
];

const TEST_CLASS_NAMES_TO_REMOVE = ["All-Levels Jiu Jitsu", "Open Mat"];

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function getLondonParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function londonLocalDateTimeToUtcIso(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let guess = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = getLondonParts(new Date(guess));
    const londonYear = Number(parts.year);
    const londonMonth = Number(parts.month);
    const londonDay = Number(parts.day);
    const londonHour = Number(parts.hour);
    const londonMinute = Number(parts.minute);

    if (
      londonYear === year &&
      londonMonth === month &&
      londonDay === day &&
      londonHour === hour &&
      londonMinute === minute
    ) {
      return new Date(guess).toISOString();
    }

    const targetMinutes = hour * 60 + minute;
    const actualMinutes = londonHour * 60 + londonMinute;
    guess += (targetMinutes - actualMinutes) * 60 * 1000;
  }

  return new Date(guess).toISOString();
}

function getLondonTodayDateKey(from = new Date()) {
  const parts = getLondonParts(from);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addLondonCalendarDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  const y = anchor.getUTCFullYear();
  const m = String(anchor.getUTCMonth() + 1).padStart(2, "0");
  const d = String(anchor.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeLondonClockTime(value) {
  return value?.slice(0, 5) ?? "00:00";
}

function encodeLocationForExternalId(location) {
  return encodeURIComponent(location ?? "").replace(/%/g, "");
}

function utcIsoToLondonDayOfWeek(iso) {
  const parts = getLondonParts(new Date(iso));
  const date = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
  return date.getUTCDay();
}

async function countSessionBookings(sessionIds) {
  if (sessionIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: true })
    .in("class_session_id", sessionIds);

  if (error) throw new Error(`Failed to count bookings: ${error.message}`);
  return count ?? 0;
}

async function countSessionAttendance(sessionIds) {
  if (sessionIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .in("class_session_id", sessionIds);

  if (error) throw new Error(`Failed to count attendance: ${error.message}`);
  return count ?? 0;
}

async function loadBahamasSessionIds() {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("club_id", BAHAMAS_CLUB_ID);

  if (error) throw new Error(`Failed to load sessions: ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

async function cleanupBahamasTestData() {
  const sessionIds = await loadBahamasSessionIds();
  const bookingCount = await countSessionBookings(sessionIds);
  const attendanceCount = await countSessionAttendance(sessionIds);

  if (bookingCount > 0 || attendanceCount > 0) {
    throw new Error(
      `Refusing cleanup: Bahamas has ${bookingCount} bookings and ${attendanceCount} attendance records.`,
    );
  }

  const { data: schedules, error: schedulesError } = await supabase
    .from("recurring_class_schedules")
    .select("id")
    .eq("club_id", BAHAMAS_CLUB_ID);

  if (schedulesError) {
    throw new Error(`Failed to load schedules: ${schedulesError.message}`);
  }

  if (schedules?.length) {
    console.log(`Removing ${schedules.length} existing recurring schedule(s)...`);
    if (!dryRun) {
      const { error } = await supabase
        .from("recurring_class_schedules")
        .delete()
        .eq("club_id", BAHAMAS_CLUB_ID);
      if (error) throw new Error(`Failed to delete schedules: ${error.message}`);
    }
  }

  if (sessionIds.length) {
    console.log(`Removing ${sessionIds.length} existing class session(s)...`);
    if (!dryRun) {
      const { error } = await supabase
        .from("class_sessions")
        .delete()
        .eq("club_id", BAHAMAS_CLUB_ID);
      if (error) throw new Error(`Failed to delete sessions: ${error.message}`);
    }
  }

  for (const className of TEST_CLASS_NAMES_TO_REMOVE) {
    const { data: classRow, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("club_id", BAHAMAS_CLUB_ID)
      .eq("name", className)
      .maybeSingle();

    if (classError) {
      throw new Error(`Failed to load class ${className}: ${classError.message}`);
    }

    if (!classRow) continue;

    console.log(`Removing test class template: ${className}`);
    if (!dryRun) {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classRow.id)
        .eq("club_id", BAHAMAS_CLUB_ID);
      if (error) throw new Error(`Failed to delete class ${className}: ${error.message}`);
    }
  }
}

async function findOrCreateClassTemplate(className) {
  const { data: existing, error: existingError } = await supabase
    .from("classes")
    .select("id, programme_type, programme_id")
    .eq("club_id", BAHAMAS_CLUB_ID)
    .eq("name", className)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load class template ${className}: ${existingError.message}`);
  }

  if (existing) {
    if (existing.programme_type !== PROGRAMME_TYPE) {
      throw new Error(
        `Class "${className}" exists with programme_type ${existing.programme_type}.`,
      );
    }

    if (!existing.programme_id) {
      console.log(`Linking existing class "${className}" to Bahamas BJJ programme`);
      if (!dryRun) {
        const { error } = await supabase
          .from("classes")
          .update({
            programme_id: BJJ_PROGRAMME_ID,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .eq("club_id", BAHAMAS_CLUB_ID);
        if (error) {
          throw new Error(`Failed to link class ${className}: ${error.message}`);
        }
      }
    }

    return existing.id;
  }

  console.log(`Creating class template: ${className}`);
  if (dryRun) return `dry-run-class-${className}`;

  const { data: created, error: createError } = await supabase
    .from("classes")
    .insert({
      club_id: BAHAMAS_CLUB_ID,
      name: className,
      programme_type: PROGRAMME_TYPE,
      programme_id: BJJ_PROGRAMME_ID,
      is_active: true,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(`Failed to create class ${className}: ${createError.message}`);
  }

  return created.id;
}

async function findExistingSchedule(classId, schedule) {
  if (dryRun || String(classId).startsWith("dry-run")) return null;

  const { data, error } = await supabase
    .from("recurring_class_schedules")
    .select("id")
    .eq("club_id", BAHAMAS_CLUB_ID)
    .eq("class_id", classId)
    .eq("day_of_week", schedule.dayOfWeek)
    .eq("start_time", schedule.startTime)
    .eq("end_time", schedule.endTime)
    .eq("location", LOCATION)
    .maybeSingle();

  if (error) throw new Error(`Failed to check duplicate schedule: ${error.message}`);
  return data?.id ?? null;
}

async function createRecurringSchedule(classId, schedule) {
  const existingId = await findExistingSchedule(classId, schedule);
  if (existingId) {
    console.log(
      `Skipping duplicate schedule: ${schedule.className} DOW ${schedule.dayOfWeek} ${schedule.startTime}`,
    );
    return existingId;
  }

  console.log(
    `Creating schedule: ${schedule.className} (day ${schedule.dayOfWeek}) ${schedule.startTime}-${schedule.endTime}`,
  );

  if (dryRun) return `dry-run-schedule-${schedule.className}-${schedule.startTime}`;

  const { data, error } = await supabase
    .from("recurring_class_schedules")
    .insert({
      club_id: BAHAMAS_CLUB_ID,
      class_id: classId,
      day_of_week: schedule.dayOfWeek,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      capacity: CAPACITY,
      location: LOCATION,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create schedule: ${error.message}`);
  return data.id;
}

async function generateRecurringClassSessionsFallback(schedule, daysAhead) {
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

  if (error) throw new Error(`Failed to load existing sessions: ${error.message}`);

  const existingStartsAt = new Set(
    (data ?? []).map((row) => new Date(row.starts_at).toISOString()),
  );

  const startTime = normalizeLondonClockTime(schedule.start_time);
  const endTime = normalizeLondonClockTime(schedule.end_time);
  const rows = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const dateKey = addLondonCalendarDays(todayKey, offset);
    const startsAt = londonLocalDateTimeToUtcIso(dateKey, startTime);

    if (utcIsoToLondonDayOfWeek(startsAt) !== schedule.day_of_week) continue;
    if (existingStartsAt.has(startsAt)) continue;

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

  if (rows.length === 0) return 0;
  if (dryRun) return rows.length;

  const { error: insertError } = await supabase.from("class_sessions").insert(rows);
  if (insertError) throw new Error(`Failed to insert sessions: ${insertError.message}`);
  return rows.length;
}

async function generateRecurringClassSessions(scheduleId, daysAhead) {
  if (dryRun) {
    const { data: schedule, error } = await supabase
      .from("recurring_class_schedules")
      .select(
        "id, club_id, class_id, day_of_week, start_time, end_time, capacity, location, is_active",
      )
      .eq("id", scheduleId)
      .single();
    if (error) throw new Error(error.message);
    const inserted = await generateRecurringClassSessionsFallback(schedule, daysAhead);
    return { inserted, mode: "dry-run-fallback" };
  }

  const { data, error } = await supabase.rpc("generate_recurring_class_sessions", {
    p_schedule_id: scheduleId,
    p_days_ahead: daysAhead,
  });

  if (!error) return { inserted: data ?? 0, mode: "rpc" };

  if (
    error.message.includes("london_wall_clock_to_timestamptz") &&
    error.message.includes("does not exist")
  ) {
    const { data: schedule, error: scheduleError } = await supabase
      .from("recurring_class_schedules")
      .select(
        "id, club_id, class_id, day_of_week, start_time, end_time, capacity, location, is_active",
      )
      .eq("id", scheduleId)
      .single();
    if (scheduleError) throw new Error(scheduleError.message);
    const inserted = await generateRecurringClassSessionsFallback(schedule, daysAhead);
    return { inserted, mode: "fallback" };
  }

  throw new Error(error.message);
}

async function printSummary() {
  const { data: schedules, error } = await supabase
    .from("recurring_class_schedules")
    .select("id, day_of_week, start_time, end_time, capacity, location, classes(name, programme_type, programme_id)")
    .eq("club_id", BAHAMAS_CLUB_ID)
    .order("day_of_week")
    .order("start_time");

  if (error) throw new Error(error.message);

  const { count: sessionCount } = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("club_id", BAHAMAS_CLUB_ID)
    .eq("status", "scheduled");

  console.log("\n=== Summary ===");
  console.log(`Recurring schedules: ${schedules?.length ?? 0}`);
  console.log(`Scheduled sessions: ${sessionCount ?? 0}`);
  for (const row of schedules ?? []) {
    const className = row.classes?.name ?? "Unknown";
    console.log(
      `  ${className} | day ${row.day_of_week} | ${row.start_time?.slice(0, 5)}-${row.end_time?.slice(0, 5)} | programme_id ${row.classes?.programme_id ?? "null"}`,
    );
  }
}

async function main() {
  console.log(dryRun ? "DRY RUN" : "LIVE RUN");
  console.log(`Academy: Bahamas Jiu Jitsu (${BAHAMAS_CLUB_ID})`);
  console.log(`Programme: BJJ (${BJJ_PROGRAMME_ID})`);
  console.log(`Location: ${LOCATION}`);
  console.log(`Session horizon: ${SESSION_DAYS_AHEAD} days`);

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("id", BAHAMAS_CLUB_ID)
    .maybeSingle();

  if (clubError || !club || club.slug !== BAHAMAS_CLUB_SLUG) {
    throw new Error("Bahamas Jiu Jitsu club not found or slug mismatch.");
  }

  const { data: programme, error: programmeError } = await supabase
    .from("programmes")
    .select("id, programme_type, is_active, club_id")
    .eq("id", BJJ_PROGRAMME_ID)
    .maybeSingle();

  if (
    programmeError ||
    !programme ||
    programme.club_id !== BAHAMAS_CLUB_ID ||
    programme.programme_type !== "bjj" ||
    programme.is_active === false
  ) {
    throw new Error("Bahamas BJJ programme not found or inactive.");
  }

  await cleanupBahamasTestData();

  const createdSchedules = [];

  for (const schedule of SCHEDULES) {
    const classId = await findOrCreateClassTemplate(schedule.className);
    const scheduleId = await createRecurringSchedule(classId, schedule);
    createdSchedules.push({ scheduleId, className: schedule.className });
  }

  for (const { scheduleId, className } of createdSchedules) {
    if (String(scheduleId).startsWith("dry-run")) continue;
    const result = await generateRecurringClassSessions(
      scheduleId,
      SESSION_DAYS_AHEAD,
    );
    console.log(
      `Generated sessions for ${className}: ${result.inserted} (${result.mode})`,
    );
  }

  await printSummary();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
