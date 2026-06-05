#!/usr/bin/env node
/**
 * Normalize Kingston Jiu Jitsu Kids recurring block bookings to exactly 52 future
 * booked sessions per student on a given schedule.
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
const SESSION_COUNT = 52;
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

function isActiveBookingStatus(status) {
  return status === "booked" || status === "waitlisted" || status === "walk_in";
}

async function loadAllFutureSessions(schedule) {
  const nowIso = new Date().toISOString();
  const end = new Date();
  end.setFullYear(end.getFullYear() + 2);

  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, capacity, status, starts_at, recurring_schedule_id, external_id, source")
    .eq("club_id", schedule.club_id)
    .eq("class_id", schedule.class_id)
    .gte("starts_at", nowIso)
    .lte("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Unable to load sessions: ${error.message}`);

  const matched = (data ?? []).filter((session) =>
    sessionMatchesRecurringSchedule(session, schedule),
  );

  return Array.from(new Map(matched.map((session) => [session.id, session])).values());
}

function getCanonicalSessions(allFutureSessions) {
  return allFutureSessions
    .filter((session) => session.status !== "cancelled")
    .slice(0, SESSION_COUNT);
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

async function cancelFutureBooking(attendeeId) {
  if (dryRun) return;

  const { error } = await supabase
    .from("session_attendees")
    .update({
      booking_status: "cancelled",
      attendance_status: "not_marked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", attendeeId);

  if (error) throw new Error(`Unable to cancel booking: ${error.message}`);
}

async function normalizeStudentBookings(schedule, userId, allFutureSessions, canonicalSessions) {
  const canonicalSessionIds = new Set(canonicalSessions.map((session) => session.id));
  const result = {
    bookedCount: 0,
    trimmedCount: 0,
    skippedAlreadyBooked: 0,
    skippedFull: 0,
    finalBookedCount: 0,
  };

  for (const session of allFutureSessions) {
    if (canonicalSessionIds.has(session.id)) continue;

    const existing = await getExistingAttendee(session.id, userId);
    if (!isActiveBookingStatus(existing?.booking_status)) continue;

    await cancelFutureBooking(existing.id);
    result.trimmedCount += 1;
  }

  for (const session of canonicalSessions) {
    const existing = await getExistingAttendee(session.id, userId);

    if (isActiveBookingStatus(existing?.booking_status)) {
      if (existing.booking_status === "booked") {
        result.skippedAlreadyBooked += 1;
        result.finalBookedCount += 1;
      } else {
        const payload = buildAdminBookingPayload();
        if (!dryRun) {
          const { error } = await supabase
            .from("session_attendees")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw new Error(`Unable to block book session: ${error.message}`);
        }
        result.bookedCount += 1;
        result.finalBookedCount += 1;
      }
      continue;
    }

    const bookedCount = await getBookedCountForSession(session.id);
    const hasSpace = session.capacity === null || bookedCount < session.capacity;

    if (!hasSpace) {
      result.skippedFull += 1;
      continue;
    }

    const payload = buildAdminBookingPayload();

    if (dryRun) {
      result.bookedCount += 1;
      result.finalBookedCount += 1;
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
    result.finalBookedCount += 1;
  }

  return result;
}

async function main() {
  console.log(
    `${dryRun ? "[dry-run] " : ""}Normalizing KJJ Kids block bookings to ${SESSION_COUNT} sessions for schedule ${scheduleId}`,
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

    console.log(`Ensured sessions exist (${inserted ?? 0} new session(s) generated).`);
  }

  const allFutureSessions = await loadAllFutureSessions(schedule);
  const canonicalSessions = getCanonicalSessions(allFutureSessions);

  if (canonicalSessions.length < SESSION_COUNT) {
    throw new Error(
      `Only ${canonicalSessions.length} non-cancelled future sessions available; need ${SESSION_COUNT}.`,
    );
  }

  const allFutureSessionIds = allFutureSessions.map((session) => session.id);
  const { data: attendeeRows, error: attendeeError } = await supabase
    .from("session_attendees")
    .select("user_id")
    .in("class_session_id", allFutureSessionIds)
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
    `Normalizing ${userIds.length} student(s) across ${canonicalSessions.length} canonical session(s).`,
  );

  const counts = [];

  for (const user of users ?? []) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.id;
    const result = await normalizeStudentBookings(
      schedule,
      user.id,
      allFutureSessions,
      canonicalSessions,
    );
    counts.push(result.finalBookedCount);
    console.log(
      `  ${name}: +${result.bookedCount} booked, -${result.trimmedCount} trimmed, ${result.skippedAlreadyBooked} kept → ${result.finalBookedCount} future booked`,
    );
  }

  const uniqueCounts = [...new Set(counts)];
  console.log(`\nSummary: ${userIds.length} students, unique future booked counts: ${uniqueCounts.join(", ")}`);

  if (!uniqueCounts.every((count) => count === SESSION_COUNT)) {
    throw new Error(`Normalization failed: not all students have exactly ${SESSION_COUNT} bookings.`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
