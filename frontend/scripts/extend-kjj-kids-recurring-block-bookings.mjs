#!/usr/bin/env node
/**
 * Generate recurring sessions up to 52 weeks ahead and extend block bookings for
 * Kingston Jiu Jitsu Kids students already booked on a recurring schedule.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/extend-kjj-kids-recurring-block-bookings.mjs
 *
 * Options:
 *   --dry-run   Report planned changes without writing
 *   --schedule-id <uuid>  Recurring schedule (default: Kids Jiu Jitsu 11-15 Monday)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIDS_SLUG = "kingston-jiu-jitsu-kids";
const DEFAULT_SCHEDULE_ID = "7bbaa8b0-b587-496f-a7cc-4dcf73494a20";
const DAYS_AHEAD = 364;

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
const scheduleIdArgIndex = process.argv.indexOf("--schedule-id");
const scheduleId =
  scheduleIdArgIndex !== -1
    ? process.argv[scheduleIdArgIndex + 1]
    : DEFAULT_SCHEDULE_ID;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LONDON_DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getLondonDayOfWeek(startsAt) {
  const dayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/London",
    weekday: "short",
  }).format(new Date(startsAt));
  return LONDON_DOW[dayLabel];
}

function normalizeScheduleTime(timeValue) {
  return timeValue.slice(0, 5);
}

function parseExternalIdSlot(externalId) {
  if (!externalId) return null;
  const parts = externalId.split(":");
  if (parts.length < 4) return null;
  const time = parts[parts.length - 2];
  const location = parts[parts.length - 1]?.replace(/_/g, " ") ?? null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  return { time, location };
}

function resolveSessionSlotTimeFromRow(session) {
  const parsed = parseExternalIdSlot(session.external_id);
  if (parsed?.time) return parsed.time;
  const startsAt = new Date(session.starts_at);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(startsAt);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function resolveSessionLocationFromRow(session) {
  const parsed = parseExternalIdSlot(session.external_id);
  return parsed?.location ?? null;
}

function sessionMatchesRecurringSchedule(session, schedule) {
  if (session.recurring_schedule_id === schedule.id) return true;

  const dayOfWeek = getLondonDayOfWeek(session.starts_at);
  const slotTime = resolveSessionSlotTimeFromRow(session);
  const slotLocation = resolveSessionLocationFromRow(session);

  if (dayOfWeek === undefined) return false;
  if (dayOfWeek !== schedule.day_of_week) return false;
  if (slotTime !== normalizeScheduleTime(schedule.start_time)) return false;
  if (schedule.location && slotLocation) {
    return schedule.location === slotLocation;
  }
  return true;
}

function londonLocalDateTimeToUtcIso(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let guess = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(guess))
      .filter((part) => part.type !== "literal");

    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const londonYear = Number(map.year);
    const londonMonth = Number(map.month);
    const londonDay = Number(map.day);
    const londonHour = Number(map.hour);
    const londonMinute = Number(map.minute);

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

function getBlockBookingEndDate() {
  const date = new Date();
  date.setDate(date.getDate() + DAYS_AHEAD);
  return date.toISOString().slice(0, 10);
}

async function loadFutureSessionsForSchedule(schedule, endIso) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, capacity, status, starts_at, recurring_schedule_id, external_id, source")
    .eq("club_id", schedule.club_id)
    .eq("class_id", schedule.class_id)
    .gte("starts_at", nowIso)
    .lte("starts_at", endIso)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Unable to load sessions: ${error.message}`);

  const matched = (data ?? []).filter((session) =>
    sessionMatchesRecurringSchedule(session, schedule),
  );

  return Array.from(new Map(matched.map((session) => [session.id, session])).values());
}

async function getExistingAttendee(sessionId, userId) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, booking_status")
    .eq("class_session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load attendee: ${error.message}`);
  return data;
}

async function getBookedCountForSession(sessionId) {
  const { count, error } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: true })
    .eq("class_session_id", sessionId)
    .eq("booking_status", "booked");

  if (error) throw new Error(`Unable to count bookings: ${error.message}`);
  return count ?? 0;
}

function buildAdminBookingPayload() {
  return {
    booking_status: "booked",
    attendance_status: "not_marked",
    source: "student_booking",
    booked_at: new Date().toISOString(),
  };
}

async function blockBookStudent(schedule, userId, endDate) {
  const endIso = londonLocalDateTimeToUtcIso(endDate, "23:59");
  const sessions = await loadFutureSessionsForSchedule(schedule, endIso);
  const result = {
    bookedCount: 0,
    skipped: { cancelled: 0, alreadyBooked: 0, full: 0 },
    futureBookingCount: 0,
  };

  for (const session of sessions) {
    if (session.status === "cancelled") {
      result.skipped.cancelled += 1;
      continue;
    }

    const existing = await getExistingAttendee(session.id, userId);

    if (
      existing?.booking_status === "booked" ||
      existing?.booking_status === "waitlisted" ||
      existing?.booking_status === "walk_in"
    ) {
      result.skipped.alreadyBooked += 1;
      result.futureBookingCount += 1;
      continue;
    }

    const bookedCount = await getBookedCountForSession(session.id);
    const hasSpace = session.capacity === null || bookedCount < session.capacity;

    if (!hasSpace) {
      result.skipped.full += 1;
      continue;
    }

    const payload = buildAdminBookingPayload();

    if (dryRun) {
      result.bookedCount += 1;
      result.futureBookingCount += 1;
      continue;
    }

    if (existing) {
      const { error } = await supabase
        .from("session_attendees")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(`Unable to block book session: ${error.message}`);
    } else {
      const { error } = await supabase.from("session_attendees").insert({
        class_session_id: session.id,
        user_id: userId,
        ...payload,
      });
      if (error) throw new Error(`Unable to block book session: ${error.message}`);
    }

    result.bookedCount += 1;
    result.futureBookingCount += 1;
  }

  return result;
}

async function main() {
  console.log(
    `${dryRun ? "[dry-run] " : ""}Extending KJJ Kids block bookings for schedule ${scheduleId}`,
  );

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, slug, name")
    .eq("slug", KIDS_SLUG)
    .maybeSingle();

  if (clubError || !club) {
    throw new Error(`Kids club not found: ${clubError?.message ?? "missing row"}`);
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("recurring_class_schedules")
    .select("id, club_id, class_id, day_of_week, start_time, location, is_active")
    .eq("id", scheduleId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (scheduleError || !schedule) {
    throw new Error(
      `Schedule not found for ${KIDS_SLUG}: ${scheduleError?.message ?? scheduleId}`,
    );
  }

  if (!dryRun) {
    const { data: inserted, error: generateError } = await supabase.rpc(
      "generate_recurring_class_sessions",
      { p_schedule_id: scheduleId, p_days_ahead: DAYS_AHEAD },
    );

    if (generateError) {
      throw new Error(`Session generation failed: ${generateError.message}`);
    }

    console.log(`Generated ${inserted ?? 0} new session(s) up to ${DAYS_AHEAD} days ahead.`);
  } else {
    console.log(`Would generate sessions up to ${DAYS_AHEAD} days ahead.`);
  }

  const endDate = getBlockBookingEndDate();
  const endIso = londonLocalDateTimeToUtcIso(endDate, "23:59");
  const sessions = await loadFutureSessionsForSchedule(schedule, endIso);
  const sessionIds = sessions.map((session) => session.id);

  if (sessionIds.length === 0) {
    console.log("No future sessions found for this schedule.");
    return;
  }

  const { data: attendeeRows, error: attendeeError } = await supabase
    .from("session_attendees")
    .select("user_id")
    .in("class_session_id", sessionIds)
    .in("booking_status", ["booked", "waitlisted", "walk_in"]);

  if (attendeeError) {
    throw new Error(`Unable to load booked students: ${attendeeError.message}`);
  }

  const userIds = [...new Set((attendeeRows ?? []).map((row) => row.user_id))];

  if (userIds.length === 0) {
    console.log("No students with future bookings on this schedule.");
    return;
  }

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  if (usersError) {
    throw new Error(`Unable to load students: ${usersError.message}`);
  }

  console.log(
    `Extending ${userIds.length} student(s) through ${endDate} across ${sessions.length} future session(s).`,
  );

  for (const user of users ?? []) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.id;
    const result = await blockBookStudent(schedule, user.id, endDate);
    console.log(
      `  ${name}: +${result.bookedCount} booked, ${result.skipped.alreadyBooked} already booked, ${result.skipped.cancelled} cancelled skipped, ${result.skipped.full} full skipped → ${result.futureBookingCount} total in horizon`,
    );
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
