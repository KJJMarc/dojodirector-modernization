#!/usr/bin/env node
/**
 * Verify recurring session generation for Kingston Jiu Jitsu Kids Saturday classes.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/verify-kids-saturday-recurring-generation.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIDS_SLUG = "kingston-jiu-jitsu-kids";
const CLASS_NAME = "Kids Jiu Jitsu (5-10)";
const ST_JOHN_LOCATION = "St. John's Parish Hall";
const SATURDAY_DOW = 6;

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LONDON = "Europe/London";

function getLondonParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
}

function londonLocalDateTimeToUtcIso(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = getLondonParts(new Date(guess));
    if (
      Number(parts.year) === year &&
      Number(parts.month) === month &&
      Number(parts.day) === day &&
      Number(parts.hour) === hour &&
      Number(parts.minute) === minute
    ) {
      return new Date(guess).toISOString();
    }
    const target = hour * 60 + minute;
    const actual = Number(parts.hour) * 60 + Number(parts.minute);
    guess += (target - actual) * 60 * 1000;
  }
  return new Date(guess).toISOString();
}

function getLondonTodayDateKey(from = new Date()) {
  const p = getLondonParts(from);
  return `${p.year}-${p.month}-${p.day}`;
}

function addLondonCalendarDays(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, "0")}-${String(anchor.getUTCDate()).padStart(2, "0")}`;
}

function utcIsoToLondonDayOfWeek(iso) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: LONDON,
    weekday: "short",
  }).format(new Date(iso));
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday];
}

function normalizeClockTime(value) {
  const [hourPart, minutePart = "00"] = value.trim().split(":");
  return `${String(Number(hourPart)).padStart(2, "0")}:${String(Number(minutePart)).padStart(2, "0")}`;
}

function encodeLocationForExternalId(location) {
  return location.trim().replace(/\s+/g, "_");
}

async function generateRecurringClassSessionsFallback(schedule, daysAhead = 7) {
  const todayKey = getLondonTodayDateKey();
  const startTime = normalizeClockTime(schedule.start_time);
  const endTime = normalizeClockTime(schedule.end_time);
  const rows = [];

  const { data: existing } = await supabase
    .from("class_sessions")
    .select("starts_at, status")
    .eq("club_id", schedule.club_id)
    .eq("class_id", schedule.class_id)
    .gte("starts_at", londonLocalDateTimeToUtcIso(todayKey, "00:00"));

  const existingStarts = new Set(
    (existing ?? [])
      .filter((row) => row.status !== "cancelled")
      .map((row) => new Date(row.starts_at).toISOString()),
  );

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const dateKey = addLondonCalendarDays(todayKey, offset);
    const startsAt = londonLocalDateTimeToUtcIso(dateKey, startTime);
    if (utcIsoToLondonDayOfWeek(startsAt) !== schedule.day_of_week) continue;
    if (existingStarts.has(startsAt)) continue;

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
    existingStarts.add(startsAt);
  }

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("class_sessions").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

async function generateRecurringClassSessions(scheduleId, daysAhead = 7) {
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

async function main() {
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("slug", KIDS_SLUG)
    .single();

  if (clubError || !club) {
    throw new Error(`Club not found: ${KIDS_SLUG}`);
  }

  const { data: cls, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("club_id", club.id)
    .eq("name", CLASS_NAME)
    .single();

  if (classError || !cls) {
    throw new Error(`Class not found: ${CLASS_NAME}`);
  }

  const { data: schedules, error: schedulesError } = await supabase
    .from("recurring_class_schedules")
    .select("id, day_of_week, start_time, end_time, location, is_active")
    .eq("club_id", club.id)
    .eq("class_id", cls.id)
    .eq("day_of_week", SATURDAY_DOW)
    .eq("location", ST_JOHN_LOCATION)
    .order("start_time");

  if (schedulesError) {
    throw new Error(schedulesError.message);
  }

  const saturdaySchedule = schedules?.[0];

  if (!saturdaySchedule) {
    throw new Error(`No Saturday ${CLASS_NAME} schedule at ${ST_JOHN_LOCATION}`);
  }

  console.log(`Club: ${club.name}`);
  console.log(
    `Schedule: Saturday ${saturdaySchedule.start_time} at ${saturdaySchedule.location} (${saturdaySchedule.id})`,
  );

  const beforeCount = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("recurring_schedule_id", saturdaySchedule.id)
    .gte("starts_at", new Date().toISOString())
    .neq("status", "cancelled");

  const result = await generateRecurringClassSessions(saturdaySchedule.id, 14);

  const afterCount = await supabase
    .from("class_sessions")
    .select("id", { count: "exact", head: true })
    .eq("recurring_schedule_id", saturdaySchedule.id)
    .gte("starts_at", new Date().toISOString())
    .neq("status", "cancelled");

  console.log(`Generation mode: ${result.mode}`);
  console.log(`Inserted this run: ${result.inserted}`);
  console.log(
    `Future sessions: ${beforeCount.count ?? 0} -> ${afterCount.count ?? 0}`,
  );

  const { data: rpcCheck, error: rpcError } = await supabase.rpc(
    "london_wall_clock_to_timestamptz",
    { p_day: "2026-06-07", p_clock: "08:15:00" },
  );

  if (rpcError) {
    console.log(`london_wall_clock RPC: FAIL (${rpcError.message})`);
  } else {
    console.log(`london_wall_clock RPC: OK (${new Date(rpcCheck).toISOString()})`);
  }

  if (result.inserted >= 0 && (afterCount.count ?? 0) > 0) {
    console.log("\nOK — Saturday Kids Jiu Jitsu (5-10) recurring generation works.");
    return;
  }

  console.error("\nFAIL — no future sessions available after generation.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
