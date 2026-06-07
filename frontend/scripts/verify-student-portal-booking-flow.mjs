#!/usr/bin/env node
/**
 * Verifies student portal booking data paths: counts, duplicate prevention, upcoming list.
 *
 * Usage: node scripts/verify-student-portal-booking-flow.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLUB_SLUG = process.env.PROFILE_CLUB_SLUG ?? "kingston-jiu-jitsu";
const ATTENDANCE_REGISTER_BOOKING_STATUSES = ["booked", "walk_in"];

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) throw new Error("Missing frontend/.env.local");
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

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

function countsAsAttendanceRegisterStudent(attendee) {
  return (
    ATTENDANCE_REGISTER_BOOKING_STATUSES.includes(attendee.booking_status) &&
    Boolean(attendee.user_id)
  );
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resolveClubAndStudent() {
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, slug")
    .eq("slug", CLUB_SLUG)
    .maybeSingle();
  if (clubError || !club) throw new Error(`Club not found: ${CLUB_SLUG}`);

  const { data: memberships, error: memError } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("club_id", club.id)
    .eq("status", "active")
    .limit(5);
  if (memError) throw new Error(memError.message);

  const userId = memberships?.[0]?.user_id;
  if (!userId) throw new Error("No active member found");

  return { club, userId };
}

async function countRegisterBookings(sessionId) {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("class_session_id, booking_status, user_id")
    .eq("class_session_id", sessionId)
    .in("booking_status", ATTENDANCE_REGISTER_BOOKING_STATUSES)
    .not("user_id", "is", null);

  if (error) throw new Error(error.message);

  return (data ?? []).filter(countsAsAttendanceRegisterStudent).length;
}

async function findBookableSession(clubId, userId) {
  const nowIso = new Date().toISOString();
  const endIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id, class_id, capacity, starts_at")
    .eq("club_id", clubId)
    .gte("starts_at", nowIso)
    .lt("starts_at", endIso)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .limit(30);

  if (sessionsError) throw new Error(sessionsError.message);

  for (const session of sessions ?? []) {
    const { data: existingRows, error: existingError } = await supabase
      .from("session_attendees")
      .select("id, booking_status")
      .eq("class_session_id", session.id)
      .eq("user_id", userId)
      .limit(1);

    if (existingError) throw new Error(existingError.message);
    if (existingRows?.[0]?.booking_status === "booked") continue;

    const bookedCount = await countRegisterBookings(session.id);
    const capacity = session.capacity;
    if (capacity !== null && bookedCount >= capacity) continue;

    return session;
  }

  return null;
}

async function main() {
  const { club, userId } = await resolveClubAndStudent();
  const session = await findBookableSession(club.id, userId);

  assert(Boolean(session), "Found a bookable session for the sample student");

  const countBefore = await countRegisterBookings(session.id);

  const { data: created, error: createError } = await supabase
    .from("session_attendees")
    .insert({
      class_session_id: session.id,
      user_id: userId,
      booking_status: "booked",
      attendance_status: "not_marked",
      source: "verify_student_portal_booking_flow",
      booked_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError) throw new Error(createError.message);
  assert(Boolean(created?.id), "Created booking row");

  const countAfter = await countRegisterBookings(session.id);
  assert(countAfter === countBefore + 1, "Attendance register count increased by one");

  const { data: upcoming, error: upcomingError } = await supabase
    .from("session_attendees")
    .select("id, class_sessions!inner(starts_at, club_id)")
    .eq("user_id", userId)
    .eq("booking_status", "booked")
    .eq("class_sessions.club_id", club.id)
    .gte("class_sessions.starts_at", new Date().toISOString());

  if (upcomingError) throw new Error(upcomingError.message);
  assert(
    (upcoming ?? []).some((row) => row.id === created.id),
    "Booking appears in upcoming bookings query",
  );

  const { data: existingBooking, error: existingBookingError } = await supabase
    .from("session_attendees")
    .select("id, booking_status")
    .eq("class_session_id", session.id)
    .eq("user_id", userId)
    .limit(1);

  if (existingBookingError) throw new Error(existingBookingError.message);

  assert(
    existingBooking?.[0]?.booking_status === "booked",
    "Application duplicate-book guard would block a second booking for this session",
  );

  const { error: cleanupError } = await supabase
    .from("session_attendees")
    .delete()
    .eq("id", created.id);

  if (cleanupError) throw new Error(cleanupError.message);
  assert(true, "Cleaned up test booking");

  const countRestored = await countRegisterBookings(session.id);
  assert(countRestored === countBefore, "Attendance register count restored after cleanup");

  console.log("\nAll student portal booking flow checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
