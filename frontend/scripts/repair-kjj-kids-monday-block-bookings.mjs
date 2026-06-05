#!/usr/bin/env node
/**
 * Targeted repair: normalize Kingston Jiu Jitsu Kids Monday 11-15 block bookings
 * to exactly 52 future booked sessions per student.
 *
 * Usage:
 *   set -a && source frontend/.env.local && set +a
 *   node frontend/scripts/repair-kjj-kids-monday-block-bookings.mjs
 *
 * Options:
 *   --dry-run   Report planned changes without writing
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIDS_SLUG = "kingston-jiu-jitsu-kids";
const SCHEDULE_ID = "7bbaa8b0-b587-496f-a7cc-4dcf73494a20";
const SESSION_COUNT = 52;
const CAPACITY = 35;

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

async function loadCanonicalSessions() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, starts_at, status, capacity")
    .eq("recurring_schedule_id", SCHEDULE_ID)
    .gte("starts_at", nowIso)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .limit(SESSION_COUNT);

  if (error) {
    throw new Error(`Unable to load canonical sessions: ${error.message}`);
  }

  return data ?? [];
}

async function ensureCanonicalSessionsExist() {
  let sessions = await loadCanonicalSessions();
  let daysAhead = 364;

  while (sessions.length < SESSION_COUNT && daysAhead <= 420) {
    if (!dryRun) {
      const { error } = await supabase.rpc("generate_recurring_class_sessions", {
        p_schedule_id: SCHEDULE_ID,
        p_days_ahead: daysAhead,
      });

      if (error) {
        throw new Error(`Session generation failed: ${error.message}`);
      }
    } else {
      console.log(`Would generate sessions with p_days_ahead=${daysAhead}`);
    }

    sessions = await loadCanonicalSessions();
    daysAhead += 56;
  }

  if (sessions.length < SESSION_COUNT) {
    throw new Error(
      `Only ${sessions.length} non-cancelled future sessions exist; need ${SESSION_COUNT}.`,
    );
  }

  return sessions;
}

async function getBookedStudents(sessionIds) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("user_id")
    .in("class_session_id", sessionIds)
    .eq("booking_status", "booked");

  if (error) {
    throw new Error(`Unable to load booked students: ${error.message}`);
  }

  return [...new Set((data ?? []).map((row) => row.user_id))];
}

async function getAllActiveStudents(allSessionIds) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("user_id")
    .in("class_session_id", allSessionIds)
    .in("booking_status", ["booked", "waitlisted", "walk_in"]);

  if (error) {
    throw new Error(`Unable to load active students: ${error.message}`);
  }

  return [...new Set((data ?? []).map((row) => row.user_id))];
}

async function getAttendee(sessionId, userId) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id, booking_status, attendance_status")
    .eq("class_session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load attendee: ${error.message}`);
  }

  return data;
}

async function getBookedCount(sessionId) {
  const { count, error } = await supabase
    .from("session_attendees")
    .select("id", { count: "exact", head: true })
    .eq("class_session_id", sessionId)
    .eq("booking_status", "booked");

  if (error) {
    throw new Error(`Unable to count bookings: ${error.message}`);
  }

  return count ?? 0;
}

function buildBookingPayload() {
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

  if (error) {
    throw new Error(`Unable to cancel booking: ${error.message}`);
  }
}

async function bookSession(sessionId, userId, existing) {
  if (dryRun) return;

  const payload = buildBookingPayload();

  if (existing) {
    const { error } = await supabase
      .from("session_attendees")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Unable to update booking: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase.from("session_attendees").insert({
    class_session_id: sessionId,
    user_id: userId,
    ...payload,
  });

  if (error) {
    throw new Error(`Unable to insert booking: ${error.message}`);
  }
}

async function countBookedInCanonical(userId, canonicalSessionIds) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("id")
    .eq("user_id", userId)
    .in("class_session_id", [...canonicalSessionIds])
    .eq("booking_status", "booked");

  if (error) {
    throw new Error(`Unable to count student bookings: ${error.message}`);
  }

  return (data ?? []).length;
}

async function repairStudent(userId, canonicalSessions, allFutureSessionIds) {
  const canonicalSessionIds = new Set(canonicalSessions.map((session) => session.id));
  const result = { added: 0, trimmed: 0, kept: 0, skippedFull: 0 };

  for (const sessionId of allFutureSessionIds) {
    if (canonicalSessionIds.has(sessionId)) continue;

    const attendee = await getAttendee(sessionId, userId);
    if (
      attendee?.booking_status === "booked" ||
      attendee?.booking_status === "waitlisted" ||
      attendee?.booking_status === "walk_in"
    ) {
      await cancelFutureBooking(attendee.id);
      result.trimmed += 1;
    }
  }

  for (const session of canonicalSessions) {
    const attendee = await getAttendee(session.id, userId);

    if (attendee?.booking_status === "booked") {
      result.kept += 1;
      continue;
    }

    const bookedCount = await getBookedCount(session.id);
    const capacity = session.capacity ?? CAPACITY;

    if (bookedCount >= capacity) {
      result.skippedFull += 1;
      continue;
    }

    await bookSession(session.id, userId, attendee);
    result.added += 1;
  }

  result.finalCount = await countBookedInCanonical(userId, canonicalSessionIds);
  return result;
}

async function main() {
  console.log(
    `${dryRun ? "[dry-run] " : ""}Repairing KJJ Kids Monday 11-15 block bookings (${SCHEDULE_ID})`,
  );

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, slug")
    .eq("slug", KIDS_SLUG)
    .maybeSingle();

  if (clubError || !club) {
    throw new Error(`Club not found: ${KIDS_SLUG}`);
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("recurring_class_schedules")
    .select("id, club_id")
    .eq("id", SCHEDULE_ID)
    .eq("club_id", club.id)
    .maybeSingle();

  if (scheduleError || !schedule) {
    throw new Error(`Schedule not found for ${KIDS_SLUG}`);
  }

  const canonicalSessions = await ensureCanonicalSessionsExist();
  const canonicalSessionIds = canonicalSessions.map((session) => session.id);
  console.log(
    `Canonical sessions: ${canonicalSessions.length} (${canonicalSessions[0].starts_at} → ${canonicalSessions[canonicalSessions.length - 1].starts_at})`,
  );

  const nowIso = new Date().toISOString();
  const { data: allFutureRows, error: allFutureError } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("recurring_schedule_id", SCHEDULE_ID)
    .gte("starts_at", nowIso);

  if (allFutureError) {
    throw new Error(`Unable to load future sessions: ${allFutureError.message}`);
  }

  const allFutureSessionIds = (allFutureRows ?? []).map((row) => row.id);
  const studentIds = await getAllActiveStudents(allFutureSessionIds);

  if (studentIds.length === 0) {
    console.log("No students with future bookings on this schedule.");
    return;
  }

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .in("id", studentIds);

  if (usersError) {
    throw new Error(`Unable to load users: ${usersError.message}`);
  }

  const userById = new Map((users ?? []).map((user) => [user.id, user]));
  const finalCounts = [];

  console.log(`Repairing ${studentIds.length} student(s)...`);

  for (const userId of studentIds) {
    const user = userById.get(userId);
    const name = user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ")
      : userId;
    const before = await countBookedInCanonical(userId, canonicalSessionIds);
    const result = await repairStudent(userId, canonicalSessions, allFutureSessionIds);
    finalCounts.push(result.finalCount);

    console.log(
      `  ${name}: ${before} → ${result.finalCount} booked (+${result.added}, kept ${result.kept}, -${result.trimmed} trimmed${result.skippedFull ? `, ${result.skippedFull} full skipped` : ""})`,
    );
  }

  const uniqueCounts = [...new Set(finalCounts)];
  console.log(`\nFinal booking counts: ${uniqueCounts.join(", ")}`);

  if (!uniqueCounts.every((count) => count === SESSION_COUNT)) {
    throw new Error(
      `Repair incomplete: expected all students at ${SESSION_COUNT}, got ${uniqueCounts.join(", ")}`,
    );
  }

  console.log("Repair complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
